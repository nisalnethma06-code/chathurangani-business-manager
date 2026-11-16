
import {
  initializeApp,
  deleteApp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
    addDoc,
    setDoc,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const $ = id => document.getElementById(id);

let app, auth, db;
let currentUser = null;
let profile = null;
let activePage = "dashboard";
let lang = "si";

const currency = n =>
  "රු. " + Number(n || 0).toLocaleString("en-US");

const dict = {
  si: {
    dashboard: "Dashboard",
    shops: "කඩවල්",
    products: "නිෂ්පාදන",
    deliveries: "බෙදාහැරීම්",
    collections: "මුදල් එකතු කිරීම්",
    sales: "විකුණුම්",
    expenses: "ව්‍යාපාර වියදම්",
    employees: "සේවකයින්",
    reports: "වාර්තා",
    logout: "Logout",
    login: "Login",
    name: "නම",
    phone: "දුරකථන අංකය",
    address: "ලිපිනය",
    price: "මිල",
    cost: "වියදම",
    amount: "මුදල",
    date: "දිනය",
    qty: "ප්‍රමාණය",
    save: "සුරකින්න",
    recent: "මෑත සටහන්",
    noData: "දත්ත නැත",
    revenue: "ආදායම",
    profit: "ලාභය",
    error: "දෝෂය",
    owner: "Owner",
    employee: "Employee"
  },
  en: {
    dashboard: "Dashboard",
    shops: "Shops",
    products: "Products",
    deliveries: "Deliveries",
    collections: "Collections",
    sales: "Sales",
    expenses: "Expenses",
    employees: "Employees",
    reports: "Reports",
    logout: "Logout",
    login: "Login",
    name: "Name",
    phone: "Phone",
    address: "Address",
    price: "Price",
    cost: "Cost",
    amount: "Amount",
    date: "Date",
    qty: "Quantity",
    save: "Save",
    recent: "Recent records",
    noData: "No data",
    revenue: "Revenue",
    profit: "Profit",
    error: "Error",
    owner: "Owner",
    employee: "Employee"
  }
};

function T(key) {
  return dict[lang][key] || key;
}

function isOwner() {
  return profile?.role === "owner";
}

function ownerOnly(page) {
  return [
    "sales",
    "expenses",
    "employees",
    "reports"
  ].includes(page);
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

async function getRows(name) {
  let q;

  if (profile.role === "employee" && name === "deliveries") {
    q = query(
      collection(db, name),
      where("assignedTo", "==", currentUser.uid),
      limit(150)
    );
  } else if (
    profile.role === "employee" &&
    name === "collections"
  ) {
    q = query(
      collection(db, name),
      where("createdBy", "==", currentUser.uid),
      limit(150)
    );
  } else {
    q = query(
      collection(db, name),
      orderBy("createdAt", "desc"),
      limit(150)
    );
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

async function saveRow(name, data) {
  await addDoc(collection(db, name), {
    ...data,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp()
  });
}

function makeTable(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.length
            ? rows.join("")
            : `<tr><td colspan="${headers.length}">${T("noData")}</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function makeForm(title, fields) {
  return `
    <section class="panel">
      <h2>${title}</h2>
      <form id="recordForm" class="form-grid">
        ${fields}
        <button class="primary" type="submit">${T("save")}</button>
      </form>
    </section>
  `;
}

function input(id, label, type = "text", required = false) {
  return `
    <label>${label}
      <input
        id="${id}"
        type="${type}"
        ${required ? "required" : ""}
      >
    </label>
  `;
}

function selectInput(id, label, items) {
  return `
    <label>${label}
      <select id="${id}" required>
        <option value="">--</option>
        ${items.map(x =>
          `<option value="${escapeHTML(x.id)}">${escapeHTML(x.name)}</option>`
        ).join("")}
      </select>
    </label>
  `;
}

function renderNavigation() {
  const pages = [
    "dashboard",
    "shops",
    "products",
    "deliveries",
    "collections",
    ...(isOwner()
      ? ["sales", "expenses", "employees", "reports"]
      : [])
  ];

  $("nav").innerHTML = pages.map(p => `
    <button
      class="nav-btn ${activePage === p ? "active" : ""}"
      data-page="${p}"
    >${T(p)}</button>
  `).join("");

  $("nav").querySelectorAll("button").forEach(button => {
    button.onclick = () => {
      activePage = button.dataset.page;
      renderNavigation();
      renderPage();
    };
  });
}

async function renderDashboard() {
  const deliveries = await getRows("deliveries");

  let content = `
    <section class="stats">
      <article class="stat panel">
        <span>${T("deliveries")}</span>
        <strong>${deliveries.length}</strong>
      </article>
    </section>
  `;

  if (isOwner()) {
    const sales = await getRows("sales");
    const expenses = await getRows("expenses");

    const revenue = sales.reduce(
      (sum, x) => sum + Number(x.total || 0), 0
    );

    const costs = expenses.reduce(
      (sum, x) => sum + Number(x.amount || 0), 0
    );

    content = `
      <section class="stats">
        <article class="stat panel">
          <span>${T("revenue")}</span>
          <strong>${currency(revenue)}</strong>
        </article>
        <article class="stat panel">
          <span>${T("expenses")}</span>
          <strong>${currency(costs)}</strong>
        </article>
        <article class="stat panel">
          <span>${T("profit")}</span>
          <strong>${currency(revenue - costs)}</strong>
        </article>
        <article class="stat panel">
          <span>${T("deliveries")}</span>
          <strong>${deliveries.length}</strong>
        </article>
      </section>
    `;
  }

  $("page").innerHTML = content;
}

async function renderShops() {
  const rows = await getRows("shops");

  const fields =
    input("name", T("name"), "text", true) +
    input("phone", T("phone")) +
    input("address", T("address"));

  $("page").innerHTML =
    makeForm(T("shops"), fields) +
    makeTable(
      [T("name"), T("phone"), T("address")],
      rows.map(x => `
        <tr>
          <td>${escapeHTML(x.name)}</td>
          <td>${escapeHTML(x.phone)}</td>
          <td>${escapeHTML(x.address)}</td>
        </tr>
      `)
    );

  if (isOwner()) {
    $("recordForm").onsubmit = async e => {
      e.preventDefault();

      try {
        await saveRow("shops", {
          name: $("name").value,
          phone: $("phone").value,
          address: $("address").value
        });

        toast("Shop saved");
        renderPage();
      } catch (error) {
        toast(error.message);
      }
    };
  } else {
    $("recordForm").remove();
  }
}

async function renderProducts() {
  const rows = await getRows("products");

  const fields =
    input("name", T("name"), "text", true) +
    input("price", T("price"), "number", true) +
    input("unitCost", T("cost"), "number");

  $("page").innerHTML =
    (isOwner() ? makeForm(T("products"), fields) : "") +
    makeTable(
      [T("name"), T("price"), T("cost")],
      rows.map(x => `
        <tr>
          <td>${escapeHTML(x.name)}</td>
          <td>${currency(x.price)}</td>
          <td>${currency(x.unitCost)}</td>
        </tr>
      `)
    );

  if (isOwner()) {
    $("recordForm").onsubmit = async e => {
      e.preventDefault();

      try {
        await saveRow("products", {
          name: $("name").value,
          price: Number($("price").value),
          unitCost: Number($("unitCost").value)
        });

        toast("Product saved");
        renderPage();
      } catch (error) {
        toast(error.message);
      }
    };
  }
}

async function renderDeliveries() {
  const [shops, products, rows] = await Promise.all([
    getRows("shops"),
    getRows("products"),
    getRows("deliveries")
  ]);

  const fields =
    selectInput("shopId", T("shops"), shops) +
    selectInput("productId", T("products"), products) +
    input("qty", T("qty"), "number", true) +
    input("date", T("date"), "date", true) +
    (isOwner()
      ? input("assignedTo", "Employee UID")
      : "");

  $("page").innerHTML =
    makeForm(T("deliveries"), fields) +
    makeTable(
      [T("shops"), T("products"), T("qty"), T("date")],
      rows.map(x => `
        <tr>
          <td>${escapeHTML(x.shopName)}</td>
          <td>${escapeHTML(x.productName)}</td>
          <td>${escapeHTML(x.qty)}</td>
          <td>${escapeHTML(x.date)}</td>
        </tr>
      `)
    );

  $("recordForm").onsubmit = async e => {
    e.preventDefault();

    try {
      const shop = shops.find(x => x.id === $("shopId").value);
      const product = products.find(x => x.id === $("productId").value);

      if (!shop || !product) throw new Error("Select shop and product");

      await saveRow("deliveries", {
        shopId: shop.id,
        shopName: shop.name,
        productId: product.id,
        productName: product.name,
        qty: Number($("qty").value),
        date: $("date").value,
        assignedTo: isOwner()
          ? $("assignedTo").value.trim()
          : currentUser.uid,
        status: "Scheduled"
      });

      toast("Delivery saved");
      renderPage();
    } catch (error) {
      toast(error.message);
    }
  };
}

async function renderCollections() {
  const [shops, rows] = await Promise.all([
    getRows("shops"),
    getRows("collections")
  ]);

  const fields =
    selectInput("shopId", T("shops"), shops) +
    input("amount", T("amount"), "number", true) +
    input("date", T("date"), "date", true);

  $("page").innerHTML =
    makeForm(T("collections"), fields) +
    makeTable(
      [T("shops"), T("amount"), T("date")],
      rows.map(x => `
        <tr>
          <td>${escapeHTML(x.shopName)}</td>
          <td>${currency(x.amount)}</td>
          <td>${escapeHTML(x.date)}</td>
        </tr>
      `)
    );

  $("recordForm").onsubmit = async e => {
    e.preventDefault();

    try {
      const shop = shops.find(x => x.id === $("shopId").value);
      if (!shop) throw new Error("Select a shop");

      await saveRow("collections", {
        shopId: shop.id,
        shopName: shop.name,
        amount: Number($("amount").value),
        date: $("date").value
      });

      toast("Collection saved");
      renderPage();
    } catch (error) {
      toast(error.message);
    }
  };
}


async function renderOwnerPage(page) {
  if (!isOwner()) {
    $("page").innerHTML = "<h2>Access denied</h2>";
    return;
  }

  if (page === "employees") {
    const snapshot = await getDocs(
      collection(db, "users")
    );

    const employees = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(x => x.role === "employee");

    $("page").innerHTML = `
      <section class="panel">
        <h2>සේවක ගිණුම් / Employees</h2>
        <p>මුළු සේවක ඉල්ලීම්: ${employees.length}</p>
      </section>

      <section class="panel">
        ${employees.length ? employees.map(x => `
          <article class="employee-card">
            <h3>${escapeHTML(x.name)}</h3>
            <p>Email: ${escapeHTML(x.email)}</p>
            <p>Phone: ${escapeHTML(x.phone)}</p>
            <p>Status: ${escapeHTML(x.status)}</p>

            ${x.status === "pending" ? `
              <button class="primary"
                data-approve="${escapeHTML(x.id)}">
                Approve
              </button>

              <button
                data-reject="${escapeHTML(x.id)}">
                Reject
              </button>
            ` : ""}
          </article>
        `).join("") : "<p>තවම සේවක ඉල්ලීම් නැත.</p>"}
      </section>
    `;

    $("page").querySelectorAll("[data-approve]").forEach(button => {
      button.onclick = async () => {
        try {
          await updateDoc(
            doc(db, "users", button.dataset.approve),
            { status: "approved" }
          );
          toast("Employee approved");
          await renderOwnerPage("employees");
        } catch (error) {
          toast(error.message);
        }
      };
    });

    $("page").querySelectorAll("[data-reject]").forEach(button => {
      button.onclick = async () => {
        try {
          await updateDoc(
            doc(db, "users", button.dataset.reject),
            { status: "rejected" }
          );
          toast("Employee rejected");
          await renderOwnerPage("employees");
        } catch (error) {
          toast(error.message);
        }
      };
    });

    return;
  }

  const names = {
    sales: "sales",
    expenses: "expenses",
    reports: "sales"
  };

  const rows = await getRows(names[page]);

  $("page").innerHTML = `
    <section class="panel">
      <h2>${T(page)}</h2>
      <p>${rows.length} records</p>
    </section>
  `;
}


async function renderPage() {
  try {
    if (ownerOnly(activePage) && !isOwner()) {
      $("page").innerHTML = "<h2>Access denied</h2>";
      return;
    }

    switch (activePage) {
      case "dashboard":
        await renderDashboard();
        break;
      case "shops":
        await renderShops();
        break;
      case "products":
        await renderProducts();
        break;
      case "deliveries":
        await renderDeliveries();
        break;
      case "collections":
        await renderCollections();
        break;
      case "sales":
      case "expenses":
      case "employees":
      case "reports":
        await renderOwnerPage(activePage);
        break;
    }
  } catch (error) {
    $("page").innerHTML = `
      <section class="panel error">
        ${T("error")}: ${escapeHTML(error.message)}
      </section>
    `;
  }
}


async function loadProfile(user) {
  const snapshot = await getDoc(doc(db, "users", user.uid));

  if (!snapshot.exists()) {
    throw new Error("User profile not found");
  }

  const data = snapshot.data();

  if (!["owner", "employee"].includes(data.role)) {
    throw new Error("Invalid user role");
  }

  // Employees must be approved by the owner
  if (data.role === "employee" && data.status !== "approved") {
    throw new Error("Your account is waiting for owner approval.");
  }

  return data;
}


$("langBtn").onclick = () => {
  lang = lang === "si" ? "en" : "si";
  renderNavigation();
  renderPage();
};

$("loginForm").addEventListener("submit", async e => {
$("registerForm").addEventListener("submit", async e => {
  e.preventDefault();

  const name = $("registerName").value.trim();
  const phone = $("registerPhone").value.trim();
  const email = $("registerEmail").value.trim();
  const password = $("registerPassword").value;
  const confirmPassword = $("confirmPassword").value;

  if (password !== confirmPassword) {
    $("registerMessage").textContent = "මුරපද දෙක සමාන නැහැ.";
    return;
  }

  if (password.length < 8) {
    $("registerMessage").textContent = "මුරපදය අකුරු 8ක්වත් විය යුතුයි.";
    return;
  }

  let secondaryApp;

  try {
    secondaryApp = initializeApp(
      firebaseConfig,
      "employeeRegistration"
    );

    const secondaryAuth = getAuth(secondaryApp);
    const secondaryDb = getFirestore(secondaryApp);

    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );

    await setDoc(
      doc(secondaryDb, "users", credential.user.uid),
      {
        name,
        phone,
        email,
        role: "employee",
        status: "pending",
        createdAt: serverTimestamp()
      }
    );

    await signOut(secondaryAuth);

    $("registerMessage").textContent =
      "ගිණුම සාර්ථකයි! Owner අනුමැතිය ලැබෙනතුරු රැඳී සිටින්න.";

    $("registerForm").reset();

  } catch (error) {
    $("registerMessage").textContent = error.message;
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp);
    }
  }
});
  e.preventDefault();

  try {
    await signInWithEmailAndPassword(
      auth,
      $("email").value,
      $("password").value
    );
  } catch (error) {
    $("loginMessage").textContent = error.message;
  }
});

$("logoutBtn").onclick = () => signOut(auth);

if (!firebaseConfig.apiKey ||
    firebaseConfig.apiKey.startsWith("PASTE_")) {
  $("loginMessage").textContent =
    "Please configure firebase-config.js";
} else {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, async user => {
    currentUser = user;

    if (!user) {
      profile = null;
      $("loginView").hidden = false;
      $("appView").hidden = true;
      $("logoutBtn").hidden = true;
      return;
    }

    try {
      profile = await loadProfile(user);

      $("loginView").hidden = true;
      $("appView").hidden = false;
      $("logoutBtn").hidden = false;
      $("userEmail").textContent = user.email || "";

      $("rolePill").textContent =
        profile.role === "owner" ? T("owner") : T("employee");

      activePage = "dashboard";
      renderNavigation();
      await renderPage();

    } catch (error) {
      $("loginMessage").textContent = error.message;
      await signOut(auth);
    }
  });
}
