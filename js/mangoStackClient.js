/**
 * Mango Stack API Client
 * Replaces Supabase with MangoEdgeAI backend
 */

// ✅ Configure your Mango Stack API URL
const API_BASE_URL = "https://railway-add-production-dc05.up.railway.app/api";

class MangoStackClient {
  constructor() {
    this.token = localStorage.getItem("auth_token");
    this.user = null;
  }

  // ==========================================
  // Auth Methods
  // ==========================================

  async signInWithPassword({ email, password }) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: { message: error.detail || "Login failed" } };
      }

      const data = await response.json();
      this.token = data.access_token;
      localStorage.setItem("auth_token", data.access_token);

      // Get user info
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (userResponse.ok) {
        this.user = await userResponse.json();
      }

      return {
        data: {
          session: {
            access_token: data.access_token,
            user: this.user || { email },
          },
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  async signUp({ email, password, options = {} }) {
    // For now, use the same login endpoint
    // You can create a separate /register endpoint if needed
    return {
      data: null,
      error: { message: "Signup not yet implemented. Please contact admin to create an account." },
    };
  }

  async signOut() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("auth_token");
    return { error: null };
  }

  async getSession() {
    if (!this.token) {
      return { data: { session: null }, error: null };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.ok) {
        // Token invalid
        this.token = null;
        localStorage.removeItem("auth_token");
        return { data: { session: null }, error: null };
      }

      this.user = await response.json();
      return {
        data: {
          session: {
            access_token: this.token,
            user: this.user,
          },
        },
        error: null,
      };
    } catch (err) {
      return { data: { session: null }, error: { message: err.message } };
    }
  }

  onAuthStateChange(callback) {
    // Simplified - just check on page load
    this.getSession().then(({ data }) => {
      callback("SIGNED_IN", data.session);
    });
    return { data: { subscription: {} } };
  }

  // ==========================================
  // Database Methods (Supabase-compatible API)
  // ==========================================

  from(table) {
    return new QueryBuilder(table, this.token);
  }

  // ==========================================
  // Realtime (Stub - not implemented)
  // ==========================================

  channel(name) {
    return new RealtimeChannel(name);
  }

  async removeChannel(channel) {
    // Stub
    return { error: null };
  }

  // ==========================================
  // Edge Functions (replaced with API endpoints)
  // ==========================================

  get functions() {
    return {
      invoke: async (functionName, options = {}) => {
        if (functionName === "run-now") {
          try {
            const response = await fetch(`${API_BASE_URL}/dashboard/run-now`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
              },
              body: JSON.stringify(options.body || {}),
            });

            if (!response.ok) {
              const error = await response.json();
              return { data: null, error: { message: error.detail } };
            }

            const data = await response.json();
            return { data, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        }

        return { data: null, error: { message: "Function not found" } };
      },
    };
  }

  // ==========================================
  // Auth namespace (for compatibility)
  // ==========================================

  get auth() {
    return {
      signInWithPassword: this.signInWithPassword.bind(this),
      signUp: this.signUp.bind(this),
      signOut: this.signOut.bind(this),
      getSession: this.getSession.bind(this),
      onAuthStateChange: this.onAuthStateChange.bind(this),
    };
  }
}

// ==========================================
// Query Builder (Supabase-compatible)
// ==========================================

class QueryBuilder {
  constructor(table, token) {
    this.table = table;
    this.token = token;
    this.filters = [];
    this.orderBy_ = null;
    this.limit_ = null;
  }

  select(columns = "*") {
    this.columns = columns;
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  order(column, options = {}) {
    this.orderBy_ = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(count) {
    this.limit_ = count;
    return this;
  }

  maybeSingle() {
    this.single_ = true;
    return this;
  }

  async then(resolve, reject) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }

  async execute() {
    const endpoint = this.getEndpoint();
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: { message: error.detail || "Query failed" } };
      }

      let data = await response.json();

      // Apply client-side filtering (if API doesn't support it)
      if (this.filters.length > 0) {
        data = data.filter((row) => {
          return this.filters.every((f) => {
            if (f.op === "eq") return row[f.column] === f.value;
            return true;
          });
        });
      }

      // Apply ordering
      if (this.orderBy_) {
        const { column, ascending } = this.orderBy_;
        data.sort((a, b) => {
          if (a[column] < b[column]) return ascending ? -1 : 1;
          if (a[column] > b[column]) return ascending ? 1 : -1;
          return 0;
        });
      }

      // Apply limit
      if (this.limit_) {
        data = data.slice(0, this.limit_);
      }

      // Single result
      if (this.single_) {
        data = data[0] || null;
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  getEndpoint() {
    // Map table names to API endpoints
    const farmId = this.filters.find((f) => f.column === "farm_id")?.value;

    switch (this.table) {
      case "farms":
        return "/dashboard/farms";
      case "farm_status":
        return farmId ? `/dashboard/farm-status/${farmId}` : "/dashboard/farm-status/0";
      case "ai_outputs":
        return farmId ? `/dashboard/ai-outputs/${farmId}` : "/dashboard/ai-outputs/0";
      case "notifications":
        return farmId ? `/dashboard/notifications/${farmId}` : "/dashboard/notifications/0";
      case "recs_outbox":
        const status = this.filters.find((f) => f.column === "status")?.value;
        return farmId ? `/dashboard/recs-outbox/${farmId}${status ? `?status=${status}` : ""}` : "/dashboard/recs-outbox/0";
      case "decision_audit":
        const module = this.filters.find((f) => f.column === "module")?.value;
        return farmId ? `/dashboard/decision-audit/${farmId}${module ? `?module=${module}` : ""}` : "/dashboard/decision-audit/0";
      case "telemetry":
        const metric = this.filters.find((f) => f.column === "metric")?.value;
        return farmId && metric ? `/dashboard/telemetry/${farmId}?metric=${metric}&limit=${this.limit_ || 24}` : "/dashboard/telemetry/0?metric=temp_c&limit=24";
      default:
        return `/dashboard/${this.table}`;
    }
  }

  // Insert/Update/Delete
  async insert(rows) {
    const endpoint = this.getInsertEndpoint();
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Array.isArray(rows) ? rows[0] : rows),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: { message: error.detail || "Insert failed" } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  async delete() {
    // Only supports farms delete for now
    if (this.table === "farms") {
      const farmId = this.filters.find((f) => f.column === "id")?.value;
      if (!farmId) {
        return { data: null, error: { message: "farm_id required for delete" } };
      }

      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/farms/${farmId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) {
          const error = await response.json();
          return { data: null, error: { message: error.detail || "Delete failed" } };
        }

        return { data: {}, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    }

    return { data: null, error: { message: "Delete not implemented for this table" } };
  }

  getInsertEndpoint() {
    switch (this.table) {
      case "farms":
        return "/dashboard/farms";
      case "ai_outputs":
        return "/dashboard/ai-outputs";
      case "notifications":
        return "/dashboard/notifications";
      case "recs_outbox":
        return "/dashboard/recs-outbox";
      case "decision_audit":
        return "/dashboard/decision-audit";
      case "telemetry":
        return "/dashboard/telemetry";
      default:
        return `/dashboard/${this.table}`;
    }
  }
}

// ==========================================
// Realtime Channel (Stub)
// ==========================================

class RealtimeChannel {
  constructor(name) {
    this.name = name;
    this.listeners = [];
  }

  on(event, options, callback) {
    // Stub - realtime not implemented yet
    return this;
  }

  subscribe(callback) {
    // Stub
    setTimeout(() => callback("SUBSCRIBED"), 100);
    return this;
  }
}

// ==========================================
// Export
// ==========================================

export const supabase = new MangoStackClient();
