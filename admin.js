// ============================================
// PHARMACARE ADMIN PANEL
// NO LOGIN VERSION
// ============================================

// Relies on globals defined by appwrite.js:
// account, tablesDB, DATABASE_ID,
// PRODUCTS_TABLE_ID, ORDERS_TABLE_ID

let adminProductsCache = [];
let adminOrdersCache = [];

let selectedOrderId = {
    dash: null,
    orders: null
};

const STATUS_FLOW = [
    "Pending",
    "Confirmed",
    "Packed",
    "Out for Delivery",
    "Delivered"
];


// ============================================
// INIT
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Admin panel loaded");

    // Open dashboard directly
    const dashboard = document.getElementById("dashboard");

    if (dashboard) {
        dashboard.classList.remove("hidden");
    }

    await loadDashboard();
});


// ============================================
// SECTION SWITCHING
// ============================================

function showSection(sectionId) {

    const sections = [
        "dashboardSection",
        "productsSection",
        "ordersSection",
        "customersSection",
        "reportsSection",
        "settingsSection"
    ];

    sections.forEach(id => {

        const section = document.getElementById(id);

        if (section) {
            section.classList.toggle(
                "hidden",
                id !== sectionId
            );
        }

    });


    document.querySelectorAll(".sidebar-btn").forEach(btn => {

        const attr = btn.getAttribute("onclick") || "";

        btn.classList.toggle(
            "active",
            attr.includes(sectionId)
        );

    });


    if (sectionId === "dashboardSection") {
        loadDashboard();
    }

    if (sectionId === "productsSection") {
        loadAdminProducts();
    }

    if (sectionId === "ordersSection") {
        loadOrders();
    }
}


// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {

    await Promise.all([
        loadAdminProducts(),
        loadOrders()
    ]);

}


function updateDashboardStats() {

    const orderCountEl =
        document.getElementById("orderCount");

    const pendingCountEl =
        document.getElementById("pendingCount");

    const salesTotalEl =
        document.getElementById("salesTotal");

    const todayCountEl =
        document.getElementById("todayCount");

    const ordersBadge =
        document.getElementById("ordersBadge");


    // Total Orders
    if (orderCountEl) {

        orderCountEl.textContent =
            adminOrdersCache.length;

    }


    // Pending Orders
    const pending =
        adminOrdersCache.filter(order =>
            (order.status || "Pending") === "Pending"
        ).length;


    if (pendingCountEl) {

        pendingCountEl.textContent = pending;

    }


    // Orders Badge
    if (ordersBadge) {

        ordersBadge.textContent = pending;

        ordersBadge.classList.toggle(
            "hidden",
            pending === 0
        );

    }


    // Total Sales
    if (salesTotalEl) {

        const total =
            adminOrdersCache.reduce(
                (sum, order) =>
                    sum + Number(order.total || 0),
                0
            );

        salesTotalEl.textContent =
            "₹" + formatMoney(total);

    }


    // Today's Orders
    if (todayCountEl) {

        const today =
            new Date().toDateString();

        const count =
            adminOrdersCache.filter(order =>
                order.$createdAt &&
                new Date(order.$createdAt)
                    .toDateString() === today
            ).length;

        todayCountEl.textContent = count;

    }

}


function formatMoney(value) {

    return Number(value || 0).toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );

}


// ============================================
// LOAD PRODUCTS
// ============================================

async function loadAdminProducts() {

    const grid =
        document.getElementById("adminProducts");


    try {

        const response =
            await tablesDB.listRows({

                databaseId: DATABASE_ID,

                tableId:
                    PRODUCTS_TABLE_ID

            });


        adminProductsCache =
            response.rows || [];


        renderAdminProducts();


    } catch (error) {

        console.error(
            "Load products error:",
            error
        );


        if (grid) {

            grid.innerHTML =
                "<div class='loading-state'>" +
                "Unable to load products. " +
                escapeHTML(error.message) +
                "</div>";

        }

    }

}


function renderAdminProducts() {

    const grid =
        document.getElementById("adminProducts");


    if (!grid) return;


    if (!adminProductsCache.length) {

        grid.innerHTML =
            "<div class='loading-state'>" +
            "No products yet. " +
            "Click \"+ Add Medicine\" to create one." +
            "</div>";

        return;

    }


    let rows =
        adminProductsCache.map(function (product) {

            return (
                "<tr>" +

                "<td><strong>" +
                escapeHTML(product.name || "") +
                "</strong></td>" +

                "<td>" +
                escapeHTML(product.category || "") +
                "</td>" +

                "<td>₹" +
                Number(product.price || 0)
                    .toFixed(2) +
                "</td>" +

                "<td>" +
                Number(product.stock || 0) +
                "</td>" +

                "<td>" +
                (
                    product.prescriptionRequired
                        ? "Yes"
                        : "No"
                ) +
                "</td>" +

                "<td>" +

                "<button class='danger-btn' " +

                "onclick=\"deleteProduct('" +

                escapeAttribute(product.$id) +

                "')\">" +

                "Delete" +

                "</button>" +

                "</td>" +

                "</tr>"
            );

        }).join("");


    grid.innerHTML =

        "<table class='admin-table'>" +

        "<thead>" +

        "<tr>" +

        "<th>Name</th>" +
        "<th>Category</th>" +
        "<th>Price</th>" +
        "<th>Stock</th>" +
        "<th>Rx</th>" +
        "<th></th>" +

        "</tr>" +

        "</thead>" +

        "<tbody>" +

        rows +

        "</tbody>" +

        "</table>";

}


async function deleteProduct(productId) {

    if (!confirm("Delete this product?")) {
        return;
    }


    try {

        await tablesDB.deleteRow({

            databaseId:
                DATABASE_ID,

            tableId:
                PRODUCTS_TABLE_ID,

            rowId:
                productId

        });


        await loadAdminProducts();


    } catch (error) {

        console.error(
            "Delete product error:",
            error
        );


        alert(
            "Unable to delete product:\n\n" +
            error.message
        );

    }

}


// ============================================
// PRODUCT MODAL
// ============================================

function openProductModal() {

    document
        .getElementById("productModal")
        ?.classList.add("active");

}


function closeProductModal() {

    document
        .getElementById("productModal")
        ?.classList.remove("active");

}


// ============================================
// ADD PRODUCT
// ============================================

async function addProduct() {

    const nameEl =
        document.getElementById("productName");

    const categoryEl =
        document.getElementById("productCategory");

    const descriptionEl =
        document.getElementById("productDescription");

    const priceEl =
        document.getElementById("productPrice");

    const discountEl =
        document.getElementById("productDiscount");

    const stockEl =
        document.getElementById("productStock");

    const imageEl =
        document.getElementById("productImage");

    const prescriptionEl =
        document.getElementById(
            "prescriptionRequired"
        );

    const message =
        document.getElementById("productMessage");


    if (
        !nameEl ||
        !categoryEl ||
        !priceEl ||
        !stockEl
    ) {
        return;
    }


    const name =
        nameEl.value.trim();

    const category =
        categoryEl.value;

    const description =
        descriptionEl
            ? descriptionEl.value.trim()
            : "";

    const price =
        Number(priceEl.value);

    const discountPrice =
        discountEl && discountEl.value
            ? Number(discountEl.value)
            : null;

    const stock =
        Number(stockEl.value);

    const image =
        imageEl
            ? imageEl.value.trim()
            : "";

    const prescriptionRequired =
        prescriptionEl
            ? prescriptionEl.checked
            : false;


    if (message) {

        message.style.color = "#d22";
        message.textContent = "";

    }


    if (
        !name ||
        !category ||
        !price ||
        Number.isNaN(price) ||
        Number.isNaN(stock)
    ) {

        if (message) {

            message.textContent =
                "Please fill in name, category, price and stock.";

        }

        return;

    }


    try {

        await tablesDB.createRow({

            databaseId:
                DATABASE_ID,

            tableId:
                PRODUCTS_TABLE_ID,

            rowId:
                Appwrite.ID.unique(),

            data: {

                name,
                category,
                description,
                price,
                discountPrice,
                stock,
                image,
                prescriptionRequired

            }

        });


        if (message) {

            message.style.color =
                "#087f5b";

            message.textContent =
                "Product added!";

        }


        // Reset Form
        nameEl.value = "";

        if (descriptionEl) {
            descriptionEl.value = "";
        }

        priceEl.value = "";

        if (discountEl) {
            discountEl.value = "";
        }

        stockEl.value = "";

        if (imageEl) {
            imageEl.value = "";
        }

        if (prescriptionEl) {
            prescriptionEl.checked = false;
        }


        await loadAdminProducts();


        setTimeout(
            closeProductModal,
            800
        );


    } catch (error) {

        console.error(
            "Add product error:",
            error
        );


        if (message) {

            message.style.color =
                "#d22";

            message.textContent =
                error.message ||
                "Unable to add product.";

        }

    }

}


// ============================================
// LOAD ORDERS
// ============================================

async function loadOrders() {

    try {

        const response =
            await tablesDB.listRows({

                databaseId:
                    DATABASE_ID,

                tableId:
                    ORDERS_TABLE_ID

            });


        adminOrdersCache =
            (response.rows || []).sort(
                function (a, b) {

                    return (
                        new Date(
                            b.$createdAt || 0
                        ) -

                        new Date(
                            a.$createdAt || 0
                        )
                    );

                }
            );


        // Recent Orders
        renderOrdersTable(

            "recentOrders",

            adminOrdersCache.slice(0, 6),

            "dash"

        );


        // All Orders
        renderOrdersTable(

            "adminOrders",

            adminOrdersCache,

            "orders"

        );


        updateDashboardStats();


        // Refresh status panels
        ["dash", "orders"].forEach(
            function (context) {

                if (
                    selectedOrderId[context]
                ) {

                    const order =
                        adminOrdersCache.find(
                            function (order) {

                                return (
                                    order.$id ===
                                    selectedOrderId[
                                        context
                                    ]
                                );

                            }
                        );


                    if (order) {

                        renderStatusPanel(
                            context,
                            order
                        );

                    } else {

                        clearStatusPanel(
                            context
                        );

                    }

                }

            }
        );


    } catch (error) {

        console.error(
            "Load orders error:",
            error
        );


        const html =

            "<div class='loading-state'>" +

            "Unable to load orders. " +

            escapeHTML(error.message) +

            "</div>";


        const recent =
            document.getElementById(
                "recentOrders"
            );

        const all =
            document.getElementById(
                "adminOrders"
            );


        if (recent) {
            recent.innerHTML = html;
        }

        if (all) {
            all.innerHTML = html;
        }

    }

}


// ============================================
// RENDER ORDERS TABLE
// ============================================

function renderOrdersTable(
    containerId,
    orders,
    context
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) return;


    if (!orders.length) {

        container.innerHTML =
            "<div class='loading-state'>" +
            "No orders yet." +
            "</div>";

        return;

    }


    const rows =
        orders.map(function (order) {

            const status =
                order.status ||
                "Pending";

            const statusClass =
                status
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        "-"
                    );

            const shortId =
                String(order.$id)
                    .slice(-6);

            const date =
                order.$createdAt
                    ? new Date(
                        order.$createdAt
                    ).toLocaleDateString()
                    : "—";

            const isSelected =
                selectedOrderId[
                    context
                ] === order.$id;


            return (

                "<tr class='" +

                (
                    isSelected
                        ? "row-selected"
                        : ""
                ) +

                "' " +

                "onclick=\"selectOrder('" +

                escapeAttribute(
                    order.$id
                ) +

                "','" +

                context +

                "')\">" +


                "<td>#" +

                escapeHTML(
                    shortId
                ) +

                "</td>" +


                "<td>" +

                escapeHTML(
                    order.customerName ||
                    "Customer"
                ) +

                "</td>" +


                "<td>" +

                escapeHTML(
                    order.phone ||
                    ""
                ) +

                "</td>" +


                "<td>₹" +

                Number(
                    order.total || 0
                ).toFixed(2) +

                "</td>" +


                "<td>" +

                "<span class='status-badge status-" +

                escapeAttribute(
                    statusClass
                ) +

                "'>" +

                escapeHTML(
                    status
                ) +

                "</span>" +

                "</td>" +


                "<td>" +

                escapeHTML(
                    date
                ) +

                "</td>" +


                "</tr>"

            );

        }).join("");


    container.innerHTML =

        "<table class='admin-table'>" +

        "<thead>" +

        "<tr>" +

        "<th>Order</th>" +
        "<th>Customer</th>" +
        "<th>Phone</th>" +
        "<th>Total</th>" +
        "<th>Status</th>" +
        "<th>Date</th>" +

        "</tr>" +

        "</thead>" +

        "<tbody>" +

        rows +

        "</tbody>" +

        "</table>";

}


// ============================================
// STATUS PANEL
// ============================================

function selectOrder(
    orderId,
    context
) {

    selectedOrderId[
        context
    ] = orderId;


    const order =
        adminOrdersCache.find(
            order =>
                order.$id === orderId
        );


    if (!order) return;


    renderStatusPanel(
        context,
        order
    );


    if (context === "dash") {

        renderOrdersTable(
            "recentOrders",
            adminOrdersCache.slice(0, 6),
            "dash"
        );

    }


    if (context === "orders") {

        renderOrdersTable(
            "adminOrders",
            adminOrdersCache,
            "orders"
        );

    }

}


function clearStatusPanel(
    context
) {

    selectedOrderId[
        context
    ] = null;


    const refEl =
        document.getElementById(

            context === "dash"

                ? "dashOrderRef"

                : "ordersOrderRef"

        );


    const actionsEl =
        document.getElementById(

            context === "dash"

                ? "dashStatusActions"

                : "ordersStatusActions"

        );


    if (refEl) {

        refEl.textContent =
            "No order selected";

    }


    if (actionsEl) {

        actionsEl.innerHTML =
            "<div class='empty-state'>" +
            "Click any order row to update its status." +
            "</div>";

    }

}


function renderStatusPanel(
    context,
    order
) {

    const refEl =
        document.getElementById(

            context === "dash"

                ? "dashOrderRef"

                : "ordersOrderRef"

        );


    const actionsEl =
        document.getElementById(

            context === "dash"

                ? "dashStatusActions"

                : "ordersStatusActions"

        );


    if (!refEl || !actionsEl) {
        return;
    }


    const status =
        order.status ||
        "Pending";

    const shortId =
        String(order.$id)
            .slice(-6);


    refEl.textContent =
        "Order ID: #" +
        shortId;


    if (status === "Cancelled") {

        actionsEl.innerHTML =
            "<div class='empty-state'>" +
            "This order was cancelled." +
            "</div>";

        return;

    }


    if (status === "Delivered") {

        actionsEl.innerHTML =
            "<div class='empty-state'>" +
            "✅ This order has been delivered." +
            "</div>";

        return;

    }


    const currentIndex =
        STATUS_FLOW.indexOf(
            status
        );


    const buttons = [];

    const id =
        escapeAttribute(
            order.$id
        );

    const ctx =
        context;


    if (currentIndex === 0) {

        buttons.push(

            "<button class='status-action-btn sa-confirm' " +

            "onclick=\"updateOrderStatus('" +

            id +

            "','Confirmed','" +

            ctx +

            "')\">" +

            "✅ Confirm Order" +

            "</button>"

        );

    }


    if (currentIndex === 1) {

        buttons.push(

            "<button class='status-action-btn sa-packed' " +

            "onclick=\"updateOrderStatus('" +

            id +

            "','Packed','" +

            ctx +

            "')\">" +

            "📦 Mark as Packed" +

            "</button>"

        );

    }


    if (currentIndex === 2) {

        buttons.push(

            "<button class='status-action-btn sa-delivery' " +

            "onclick=\"markOutForDelivery('" +

            id +

            "','" +

            escapeAttribute(
                order.phone || ""
            ) +

            "','" +

            escapeAttribute(
                order.customerName ||
                "Customer"
            ) +

            "','" +

            ctx +

            "')\">" +

            "🚚 Out for Delivery" +

            "</button>"

        );

    }


    if (currentIndex === 3) {

        buttons.push(

            "<button class='status-action-btn sa-delivered' " +

            "onclick=\"updateOrderStatus('" +

            id +

            "','Delivered','" +

            ctx +

            "')\">" +

            "📬 Mark Delivered" +

            "</button>"

        );

    }


    buttons.push(

        "<button class='status-action-btn sa-cancel' " +

        "onclick=\"cancelOrder('" +

        id +

        "','" +

        ctx +

        "')\">" +

        "✕ Cancel Order" +

        "</button>"

    );


    actionsEl.innerHTML =
        buttons.join("");

}


// ============================================
// UPDATE ORDER STATUS
// ============================================

async function updateOrderStatus(
    orderId,
    newStatus,
    context
) {

    try {

        await tablesDB.updateRow({

            databaseId:
                DATABASE_ID,

            tableId:
                ORDERS_TABLE_ID,

            rowId:
                orderId,

            data: {
                status:
                    newStatus
            }

        });


        await loadOrders();


    } catch (error) {

        console.error(
            "Update order status error:",
            error
        );


        alert(

            "Unable to update order status:\n\n" +

            error.message

        );

    }

}


function cancelOrder(
    orderId,
    context
) {

    if (
        !confirm(
            "Cancel this order? This cannot be undone."
        )
    ) {
        return;
    }


    updateOrderStatus(
        orderId,
        "Cancelled",
        context
    );

}


// ============================================
// OUT FOR DELIVERY + WHATSAPP
// ============================================

async function markOutForDelivery(
    orderId,
    customerPhone,
    customerName,
    context
) {

    await updateOrderStatus(
        orderId,
        "Out for Delivery",
        context
    );


    if (!customerPhone) {
        return;
    }


    const message =

        "Hi " +

        customerName +

        ", your PharmaCare order #" +

        String(orderId).slice(-6) +

        " is out for delivery! 🚚 It should reach you soon.";


    const cleaned =
        cleanPhoneForWhatsApp(
            customerPhone
        );


    if (cleaned) {

        window.open(

            "https://wa.me/" +

            cleaned +

            "?text=" +

            encodeURIComponent(
                message
            ),

            "_blank"

        );

    }

}


function cleanPhoneForWhatsApp(
    phone
) {

    let digits =
        String(phone)
            .replace(
                /\D/g,
                ""
            );


    if (!digits) {
        return "";
    }


    if (digits.length === 10) {

        digits =
            "91" + digits;

    }


    return digits;

}


// ============================================
// ESCAPE HELPERS
// ============================================

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value == null
            ? ""
            : String(value);


    return div.innerHTML;

}


function escapeAttribute(value) {

    return String(
        value == null
            ? ""
            : value
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        );

}


// ============================================
// EXPOSE GLOBAL FUNCTIONS
// ============================================

window.showSection =
    showSection;

window.openProductModal =
    openProductModal;

window.closeProductModal =
    closeProductModal;

window.addProduct =
    addProduct;

window.deleteProduct =
    deleteProduct;

window.loadOrders =
    loadOrders;

window.selectOrder =
    selectOrder;

window.updateOrderStatus =
    updateOrderStatus;

window.cancelOrder =
    cancelOrder;

window.markOutForDelivery =
    markOutForDelivery;


console.log(
    "PharmaCare admin panel loaded successfully."
);
