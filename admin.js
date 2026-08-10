// ============================================
// PHARMACARE ADMIN PANEL
// ============================================
// Assumes appwrite.js (loaded before this file) defines:
//   account, tablesDB, DATABASE_ID, PRODUCTS_TABLE_ID, ORDERS_TABLE_ID
// ============================================

let adminProductsCache = [];
let adminOrdersCache = [];

// Which order is currently selected in each status panel (dashboard vs orders tab)
let selectedOrderId = { dash: null, orders: null };

const STATUS_FLOW = ["Pending", "Confirmed", "Packed", "Out for Delivery", "Delivered"];


// ============================================
// INIT
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Admin panel loaded");
    await checkAdminSession();
});


// ============================================
// SESSION CHECK
// ============================================

async function checkAdminSession() {

    try {
        const user = await account.get();
        showDashboard(user);
    } catch {
        showLoginScreen();
    }

}

function showLoginScreen() {
    document.getElementById("adminLogin")?.classList.remove("hidden");
    document.getElementById("dashboard")?.classList.add("hidden");
}

function showDashboard(user) {

    document.getElementById("adminLogin")?.classList.add("hidden");
    document.getElementById("dashboard")?.classList.remove("hidden");

    const adminUser = document.getElementById("adminUser");
    if (adminUser) adminUser.textContent = `👤 ${user.name || user.email || "Admin"}`;

    const settingsEmail = document.getElementById("settingsAdminEmail");
    if (settingsEmail) settingsEmail.textContent = user.email || "";

    loadDashboard();

}


// ============================================
// ADMIN LOGIN / LOGOUT
// ============================================

async function adminLogin() {

    const emailElement = document.getElementById("adminEmail");
    const passwordElement = document.getElementById("adminPassword");
    const message = document.getElementById("adminLoginMessage");

    if (!emailElement || !passwordElement) return;

    const email = emailElement.value.trim();
    const password = passwordElement.value;

    if (message) { message.style.color = "#d22"; message.textContent = ""; }

    if (!email || !password) {
        if (message) message.textContent = "Please enter email and password.";
        return;
    }

    try {

        await account.createEmailPasswordSession({ email: email, password: password });

        const user = await account.get();

        if (message) { message.style.color = "#087f5b"; message.textContent = "Success!"; }

        showDashboard(user);

    } catch (error) {

        console.error("Admin login error:", error);

        if (message) {
            message.style.color = "#d22";
            message.textContent = error.message || "Login failed.";
        }

    }

}

async function adminLogout() {

    try {
        await account.deleteSession("current");
        location.reload();
    } catch (error) {
        console.error("Admin logout error:", error);
    }

}


// ============================================
// SECTION SWITCHING
// ============================================

function showSection(sectionId) {

    const sections = ["dashboardSection", "productsSection", "ordersSection", "customersSection", "reportsSection", "settingsSection"];

    sections.forEach(id => {
        document.getElementById(id)?.classList.toggle("hidden", id !== sectionId);
    });

    document.querySelectorAll(".sidebar-btn").forEach(btn => {
        const onclickAttr = btn.getAttribute("onclick") || "";
        btn.classList.toggle("active", onclickAttr.includes(sectionId));
    });

    if (sectionId === "dashboardSection") loadDashboard();
    if (sectionId === "productsSection") loadAdminProducts();
    if (sectionId === "ordersSection") loadOrders();

}


// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    await Promise.all([loadAdminProducts(), loadOrders()]);
}

function updateDashboardStats() {

    const orderCount = document.getElementById("orderCount");
    const pendingCount = document.getElementById("pendingCount");
    const salesTotal = document.getElementById("salesTotal");
    const todayCount = document.getElementById("todayCount");
    const ordersBadge = document.getElementById("ordersBadge");

    if (orderCount) orderCount.textContent = adminOrdersCache.length;

    const pending = adminOrdersCache.filter(order => (order.status || "Pending") === "Pending").length;
    if (pendingCount) pendingCount.textContent = pending;

    if (ordersBadge) {
        if (pending > 0) {
            ordersBadge.textContent = pending;
            ordersBadge.classList.remove("hidden");
        } else {
            ordersBadge.classList.add("hidden");
        }
    }

    if (salesTotal) {
        const total = adminOrdersCache.reduce((sum, order) => sum + Number(order.total || 0), 0);
        salesTotal.textContent = `₹${formatMoney(total)}`;
    }

    if (todayCount) {
        const today = new Date().toDateString();
        const count = adminOrdersCache.filter(order => {
            return order.$createdAt && new Date(order.$createdAt).toDateString() === today;
        }).length;
        todayCount.textContent = count;
    }

}

function formatMoney(value) {
    const num = Number(value || 0);
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}


// ============================================
// LOAD PRODUCTS (ADMIN)
// ============================================

async function loadAdminProducts() {

    const grid = document.getElementById("adminProducts");

    try {

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PRODUCTS_TABLE_ID
        });

        adminProductsCache = response.rows || [];

        renderAdminProducts();

    } catch (error) {

        console.error("Load admin products error:", error);

        if (grid) grid.innerHTML = `<div class="loading-state">Unable to load products. ${escapeHTML(error.message)}</div>`;

    }

}

function renderAdminProducts() {

    const grid = document.getElementById("adminProducts");

    if (!grid) return;

    if (!adminProductsCache.length) {
        grid.innerHTML = `<div class="loading-state">No products yet. Click "+ Add Medicine" to create one.</div>`;
        return;
    }

    grid.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Prescription</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${adminProductsCache.map(product => `
                    <tr>
                        <td><strong>${escapeHTML(product.name || "")}</strong></td>
                        <td>${escapeHTML(product.category || "")}</td>
                        <td>₹${Number(product.price || 0).toFixed(2)}</td>
                        <td>${Number(product.stock || 0)}</td>
                        <td>${product.prescriptionRequired ? "Yes" : "No"}</td>
                        <td><button class="danger-btn" onclick="deleteProduct('${escapeAttribute(product.$id)}')">Delete</button></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

}

async function deleteProduct(productId) {

    if (!confirm("Delete this product?")) return;

    try {

        await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: PRODUCTS_TABLE_ID,
            rowId: productId
        });

        await loadAdminProducts();

    } catch (error) {

        console.error("Delete product error:", error);
        alert("Unable to delete product:\n\n" + error.message);

    }

}


// ============================================
// PRODUCT MODAL
// ============================================

function openProductModal() { document.getElementById("productModal")?.classList.add("active"); }
function closeProductModal() { document.getElementById("productModal")?.classList.remove("active"); }


// ============================================
// ADD PRODUCT
// ============================================

async function addProduct() {

    const nameEl = document.getElementById("productName");
    const categoryEl = document.getElementById("productCategory");
    const descriptionEl = document.getElementById("productDescription");
    const priceEl = document.getElementById("productPrice");
    const discountEl = document.getElementById("productDiscount");
    const stockEl = document.getElementById("productStock");
    const imageEl = document.getElementById("productImage");
    const prescriptionEl = document.getElementById("prescriptionRequired");
    const message = document.getElementById("productMessage");

    if (!nameEl || !categoryEl || !priceEl || !stockEl) return;

    const name = nameEl.value.trim();
    const category = categoryEl.value;
    const description = descriptionEl ? descriptionEl.value.trim() : "";
    const price = Number(priceEl.value);
    const discountPrice = discountEl && discountEl.value ? Number(discountEl.value) : null;
    const stock = Number(stockEl.value);
    const image = imageEl ? imageEl.value.trim() : "";
    const prescriptionRequired = prescriptionEl ? prescriptionEl.checked : false;

    if (message) { message.style.color = "#d22"; message.textContent = ""; }

    if (!name || !category || !price || Number.isNaN(price) || Number.isNaN(stock)) {
        if (message) message.textContent = "Please fill in name, category, price, and stock.";
        return;
    }

    try {

        await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: PRODUCTS_TABLE_ID,
            rowId: Appwrite.ID.unique(),
            data: {
                name: name,
                category: category,
                description: description,
                price: price,
                discountPrice: discountPrice,
                stock: stock,
                image: image,
                prescriptionRequired: prescriptionRequired
            }
        });

        if (message) { message.style.color = "#087f5b"; message.textContent = "Product added!"; }

        nameEl.value = "";
        if (descriptionEl) descriptionEl.value = "";
        priceEl.value = "";
        if (discountEl) discountEl.value = "";
        stockEl.value = "";
        if (imageEl) imageEl.value = "";
        if (prescriptionEl) prescriptionEl.checked = false;

        await loadAdminProducts();

        setTimeout(closeProductModal, 800);

    } catch (error) {

        console.error("Add product error:", error);

        if (message) {
            message.style.color = "#d22";
            message.textContent = error.message || "Unable to add product.";
        }

    }

}


// ============================================
// LOAD ORDERS
// ============================================

async function loadOrders() {

    try {

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: ORDERS_TABLE_ID
        });

        adminOrdersCache = (response.rows || []).sort((a, b) => {
            return new Date(b.$createdAt || 0) - new Date(a.$createdAt || 0);
        });

        renderOrdersTable("recentOrders", adminOrdersCache.slice(0, 6), "dash");
        renderOrdersTable("adminOrders", adminOrdersCache, "orders");

        updateDashboardStats();

        // Re-render whichever status panel(s) currently have a selection,
        // so the panel reflects the freshest status after an update.
        ["dash", "orders"].forEach(context => {
            if (selectedOrderId[context]) {
                const order = adminOrdersCache.find(o => o.$id === selectedOrderId[context]);
                if (order) renderStatusPanel(context, order); else clearStatusPanel(context);
            }
        });

    } catch (error) {

        console.error("Load orders error:", error);

        const errorHTML = `<div class="loading-state">Unable to load orders. ${escapeHTML(error.message)}</div>`;
        const recent = document.getElementById("recentOrders");
        const all = document.getElementById("adminOrders");
        if (recent) recent.innerHTML = errorHTML;
        if (all) all.innerHTML = errorHTML;

    }

}


// ============================================
// RENDER ORDERS TABLE
// ============================================

function renderOrdersTable(containerId, orders, context) {

    const container = document.getElementById(containerId);

    if (!container) return;

    if (!orders.length) {
        container.innerHTML = `<div class="loading-state">No orders yet.</div>`;
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => {
                    const status = order.status || "Pending";
                    const statusClass = status.toLowerCase().replace(/\s+/g, "-");
                    const orderIdShort = String(order.$id).slice(-6);
                    const date = order.$createdAt ? new Date(order.$createdAt).toLocaleDateString() : "—";
                    const isSelected = selectedOrderId[context] === order.$id;

                    return `
                        <tr class="${isSelected ? "row-selected" : ""}" onclick="selectOrder('${escapeAttribute(order.$id)}', '${context}')">
                            <td>#${escapeHTML(orderIdShort)}</td>
                            <td>${escapeHTML(order.customerName || "Customer")}</td>
                            <td>${escapeHTML(order.phone || "")}</td>
                            <td>₹${Number(order.total || 0).toFixed(2)}</td>
                            <td><span class="status-badge status-${escapeAttribute(statusClass)}">${escapeHTML(status)}</span></td>
                            <td>${escapeHTML(date)}</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

}


// ============================================
// ORDER STATUS PANEL
// ============================================

function selectOrder(orderId, context) {

    selectedOrderId[context] = orderId;

    const order = adminOrdersCache.find(o => o.$id === orderId);

    if (!order) return;

    renderStatusPanel(context, order);

    // reflect selection highlight in the relevant table
    if (context === "dash") renderOrdersTable("recentOrders", adminOrdersCache.slice(0, 6), "dash");
    if (context === "orders") renderOrdersTable("adminOrders", adminOrdersCache, "orders");

}

function clearStatusPanel(context) {

    selectedOrderId[context] = null;

    const refEl = document.getElementById(context === "dash" ? "dashOrderRef" : "ordersOrderRef");
    const actionsEl = document.getElementById(context === "dash" ? "dashStatusActions" : "ordersStatusActions");

    if (refEl) refEl.textContent = "No order selected";
    if (actionsEl) actionsEl.innerHTML = `<div class="empty-state">Click any order row to update its status.</div>`;

}

function renderStatusPanel(context, order) {

    const refEl = document.getElementById(context === "dash" ? "dashOrderRef" : "ordersOrderRef");
    const actionsEl = document.getElementById(context === "dash" ? "dashStatusActions" : "ordersStatusActions");

    if (!refEl || !actionsEl) return;

    const status = order.status || "Pending";
    const orderIdShort = String(order.$id).slice(-6);

    refEl.textContent = `Order ID: #${orderIdShort}`;

    if (status === "Cancelled") {
        actionsEl.innerHTML = `<div class="empty-state">This order was cancelled.</div>`;
        return;
    }

    if (status === "Delivered") {
        actionsEl.innerHTML = `<div class="empty-state">✅ This order has been delivered.</div>`;
        return;
    }

    const currentIndex = STATUS_FLOW.indexOf(status);
    const buttons = [];

    if (currentIndex === 0) {
        buttons.push(`<button class="status-action-btn sa-confirm" onclick="updateOrderStatus('${escapeAttribute(order.$id)}', 'Confirmed', '${context}')">✅ Confirm Order</button>`);
    }
    if (currentIndex === 1) {
        buttons.push(`<button class="status-action-btn sa-packed" onclick="updateOrderStatus('${escapeAttribute(order.$id)}', 'Packed', '${context}')">📦 Mark as Packed</button>`);
    }
    if (currentIndex === 2) {
        buttons.push(`<button class="status-action-btn sa-delivery" onclick="markOutForDelivery('${escapeAttribute(order.$id)}', '${escapeAttribute(order.phone || "")}', '${escapeAttribute(order.customerName || "Customer")}', '${context}')">🚚 Out for Delivery</button>`);
    }
    if (currentIndex === 3) {
        buttons.push(`<button class="status-action-btn sa-delivered" onclick="updateOrderStatus('${escapeAttribute(order.$id)}', 'Delivered', '${context}')">📬 Mark Delivered</button>`);
    }

    buttons.push(`<button class="status-action-btn sa-cancel" onclick="cancelOrder('${escapeAttribute(order.$id)}', '${context}')">✕ Cancel Order</button>`);

    actionsEl.innerHTML = buttons.join("");

}


// ============================================
// UPDATE ORDER STATUS
// ============================================

async function updateOrderStatus(orderId, newStatus, context) {

    try {

        await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: ORDERS_TABLE_ID,
            rowId: orderId,
            data: { status: newStatus }
        });

        await loadOrders();

    } catch (error) {

        console.error("Update order status error:", error);
        alert("Unable to update order status:\n\n" + error.message);

    }

}

function cancelOrder(orderId, context) {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    updateOrderStatus(orderId, "Cancelled", context);
}


// ============================================
// MARK OUT FOR DELIVERY + NOTIFY CUSTOMER ON WHATSAPP
// ============================================

async function markOutForDelivery(orderId, customerPhone, customerName, context) {

    await updateOrderStatus(orderId, "Out for Delivery", context);

    if (!customerPhone) return;

    const message =
        `Hi ${customerName}, your PharmaCare order #${String(orderId).slice(-6)} ` +
        `is out for delivery! 🚚 It should reach you soon.`;

    const cleanedPhone = cleanPhoneForWhatsApp(customerPhone);

    if (cleanedPhone) {
        window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`, "_blank");
    }

}

function cleanPhoneForWhatsApp(phone) {

    let digits = String(phone).replace(/\D/g, "");

    if (!digits) return "";

    if (digits.length === 10) digits = "91" + digits;

    return digits;

}


// ============================================
// HTML / ATTRIBUTE ESCAPE
// ============================================

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
}

function escapeAttribute(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// ============================================
// EXPOSE FUNCTIONS FOR onclick="" HANDLERS
// ============================================

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.showSection = showSection;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.addProduct = addProduct;
window.deleteProduct = deleteProduct;
window.loadOrders = loadOrders;
window.selectOrder = selectOrder;
window.updateOrderStatus = updateOrderStatus;
window.cancelOrder = cancelOrder;
window.markOutForDelivery = markOutForDelivery;

console.log("Admin panel script loaded successfully.");