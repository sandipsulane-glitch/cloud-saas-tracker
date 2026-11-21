const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || "https://example.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "public-anon-key";
const supabase = createClient(supabaseUrl, supabaseKey);

let requestCount = 0;

app.use((req, res, next) => {
  requestCount++;
  const start = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start
    }));
  });
  next();
});

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
  <html><head><title>Cloud SaaS Task Tracker</title>
  <style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 16px}input,button{padding:8px;margin:4px 0}</style></head>
  <body>
    <h2>Cloud-Native SaaS Task & Incident Tracker</h2>
    <p>Status: <strong>Online</strong> | <a href="/health">/health</a> | <a href="/metrics">/metrics</a></p>
    <div>
      <input id="email" placeholder="Email" />
      <input id="pass" type="password" placeholder="Password" />
      <button onclick="auth('signup')">Sign Up</button>
      <button onclick="auth('login')">Log In</button>
    </div>
    <hr/>
    <div>
      <input id="title" placeholder="New task or incident..." />
      <button onclick="addTask()">Add Task</button>
    </div>
    <ul id="list"></ul>
    <script>
      let token = "";
      async function auth(mode) {
        const r = await fetch('/api/' + mode, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ email: email.value, password: pass.value })
        });
        const d = await r.json();
        token = d.access_token || "";
        alert(token ? "Authenticated!" : (d.error || "Check credentials"));
        if (token) loadTasks();
      }
      async function loadTasks() {
        const r = await fetch('/api/tasks', { headers: { Authorization: 'Bearer ' + token } });
        const data = await r.json();
        list.innerHTML = (data.tasks || []).map(t => '<li>' + t.title + ' [' + t.status + ']</li>').join('');
      }
      async function addTask() {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ title: title.value })
        });
        title.value = ""; loadTasks();
      }
    </script>
  </body></html>`);
});

app.post("/api/signup", async (req, res) => {
  const { data, error } = await supabase.auth.signUp(req.body);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ access_token: data.session?.access_token });
});

app.post("/api/login", async (req, res) => {
  const { data, error } = await supabase.auth.signInWithPassword(req.body);
  if (error) return res.status(401).json({ error: error.message });
  res.json({ access_token: data.session?.access_token });
});

app.get("/api/tasks", async (req, res) => {
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: req.headers.authorization || "" } }
  });
  const { data, error } = await userClient.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ tasks: data });
});

app.post("/api/tasks", async (req, res) => {
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: req.headers.authorization || "" } }
  });
  const { data, error } = await userClient.from("tasks").insert([{ title: req.body.title }]).select();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ task: data[0] });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", uptime_s: Math.floor(process.uptime()) });
});

app.get("/metrics", (req, res) => {
  res.type("text/plain").send(
    `app_requests_total ${requestCount}\napp_uptime_seconds ${Math.floor(process.uptime())}\n`
  );
});

if (require.main === module) {
  app.listen(process.env.PORT || 3000, () => console.log("SaaS server listening"));
}
module.exports = app;
