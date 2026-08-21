// ============================================
// PHARMACARE ADMIN PANEL
// NO LOGIN VERSION
// ============================================

// IMPORTANT:
// appwrite.js must load BEFORE this file.
//
// appwrite.js should define:
//   client
//   account
//   tablesDB
//   storage
//   DATABASE_ID
//   PRODUCTS_TABLE_ID
//   ORDERS_TABLE_ID
//   BUCKET_ID
//
// DO NOT redefine those variables here.
// ============================================


// ============================================
// CHECK APPWRITE
// ============================================

console.log("Loading PharmaCare Admin...");

if (typeof Appwrite === "undefined") {
    console.error("Appwrite SDK is not loaded.");
}

if (typeof tablesDB === "undefined") {
    console.error(
        "tablesDB is not defined. Check appwrite.js."
    );
}

if (typeof DATABASE_ID === "undefined") {
    console.error(
        "DATABASE_ID is not defined. Check appwrite.js."
    );
}

if (typeof PRODUCTS_TABLE_ID === "undefined") {
    console.error(
        "PRODUCTS_TABLE_ID is not defined. Check appwrite.js."
    );
}

if (typeof ORDERS_TABLE_ID === "undefined") {
    console.error(
        "ORDERS_TABLE_ID is not defined. Check appwrite.js."
    );
}


// ============================================
// CACHE
// ============================================

let adminProductsCache = [];
let adminOrdersCache = [];

let selectedOrderId = {
    dash: null,
    orders: null
};


// ============================================
// ORDER STATUS
// ============================================

const STATUS_FLOW = [
    "Pending",
    "Confirmed",
    "Packed",
    "Out for Delivery",
    "Delivered"
];


// ============================================
// INITIALIZATION
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "PharmaCare Admin Panel Loaded"
        );

        const dashboard =
            document.getElementById(
                "dashboard"
            );

        // Show dashboard immediately
        if (dashboard) {
            dashboard.classList.remove(
                "hidden"
            );
        }

        // Remove old login if it exists
        const login =
            document.getElementById(
                "adminLogin"
            );

        if (login) {
            login.remove();
        }

        try {

            await loadDashboard();

        } catch (error) {

            console.error(
                "Dashboard initialization error:",
                error
            );

        }

    }
);


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

    sections.forEach(
        function (id) {

            const section =
                document.getElementById(id);

            if (!section) {
                return;
            }

            section.classList.toggle(
                "hidden",
                id !== sectionId
            );

        }
    );


    // Sidebar active button
    document
        .querySelectorAll(".sidebar-btn")
        .forEach(
            function (button) {

                const onclick =
                    button.getAttribute(
                        "onclick"
                    ) || "";

                button.classList.toggle(
                    "active",
                    onclick.includes(
                        sectionId
                    )
                );

            }
        );


    // Load data when section opens
    if (
        sectionId ===
        "dashboardSection"
    ) {

        loadDashboard();

    }


    if (
        sectionId ===
        "productsSection"
    ) {

        loadAdminProducts();

    }


    if (
        sectionId ===
        "ordersSection"
    ) {

        loadOrders();

    }

}


// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {

    console.log(
        "Loading dashboard..."
    );

    await Promise.all([
        loadAdminProducts(),
        loadOrders()
    ]);

}


// ============================================
// DASHBOARD STATISTICS
// ============================================

function updateDashboardStats() {

    const orderCount =
        document.getElementById(
            "orderCount"
        );

    const pendingCount =
        document.getElementById(
            "pendingCount"
        );

    const salesTotal =
        document.getElementById(
            "salesTotal"
        );

    const todayCount =
        document.getElementById(
            "todayCount"
        );

    const ordersBadge =
        document.getElementById(
            "ordersBadge"
        );


    // Total orders
    if (orderCount) {

        orderCount.textContent =
            adminOrdersCache.length;

    }


    // Pending orders
    const pending =
        adminOrdersCache.filter(
            function (order) {

                return (
                    order.status ||
                    "Pending"
                ) === "Pending";

            }
        ).length;


    if (pendingCount) {

        pendingCount.textContent =
            pending;

    }


    // Orders badge
    if (ordersBadge) {

        ordersBadge.textContent =
            pending;

        ordersBadge.classList.toggle(
            "hidden",
            pending === 0
        );

    }


    // Sales
    if (salesTotal) {

        const total =
            adminOrdersCache.reduce(
                function (
                    sum,
                    order
                ) {

                    return (
                        sum +
                        Number(
                            order.total || 0
                        )
                    );

                },
                0
            );


        salesTotal.textContent =
            "₹" +
            formatMoney(total);

    }


    // Today's orders
    if (todayCount) {

        const today =
            new Date().toDateString();


        const count =
            adminOrdersCache.filter(
                function (order) {

                    if (!order.$createdAt) {
                        return false;
                    }

                    return (
                        new Date(
                            order.$createdAt
                        ).toDateString() ===
                        today
                    );

                }
            ).length;


        todayCount.textContent =
            count;

    }

}


// ============================================
// MONEY FORMAT
// ============================================

function formatMoney(value) {

    return Number(
        value || 0
    ).toLocaleString(
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

    const container =
        document.getElementById(
            "adminProducts"
        );


    try {

        console.log(
            "Loading products..."
        );


        const response =
            await tablesDB.listRows({

                databaseId:
                    DATABASE_ID,

                tableId:
                    PRODUCTS_TABLE_ID,

                total: true

            });


        adminProductsCache =
            response.rows || [];


        console.log(
            "Products loaded:",
            adminProductsCache.length
        );


        renderAdminProducts();


    } catch (error) {

        console.error(
            "PRODUCT LOAD ERROR:",
            error
        );


        if (container) {

            container.innerHTML =
                "<div class='loading-state'>" +
                "<strong>Unable to load products.</strong><br><br>" +
                escapeHTML(
                    getErrorMessage(error)
                ) +
                "</div>";

        }

    }

}


// ============================================
// RENDER PRODUCTS
// ============================================

function renderAdminProducts() {

    const container =
        document.getElementById(
            "adminProducts"
        );


    if (!container) {
        return;
    }


    if (
        !adminProductsCache.length
    ) {

        container.innerHTML =
            "<div class='loading-state'>" +
            "No products yet.<br><br>" +
            "Click \"+ Add Medicine\" to create one." +
            "</div>";

        return;

    }


    const rows =
        adminProductsCache
            .map(
                function (product) {

                    return (

                        "<tr>" +

                        "<td>" +
                        "<strong>" +
                        escapeHTML(
                            product.name ||
                            ""
                        ) +
                        "</strong>" +
                        "</td>" +

                        "<td>" +
                        escapeHTML(
                            product.category ||
                            ""
                        ) +
                        "</td>" +

                        "<td>₹" +
                        Number(
                            product.price || 0
                        ).toFixed(2) +
                        "</td>" +

                        "<td>" +
                        Number(
                            product.stock || 0
                        ) +
                        "</td>" +

                        "<td>" +
                        (
                            product.prescriptionRequired
                                ? "Yes"
                                : "No"
                        ) +
                        "</td>" +

                        "<td>" +

                        "<button " +
                        "class='danger-btn' " +
                        "onclick=\"deleteProduct('" +
                        escapeAttribute(
                            product.$id
                        ) +
                        "')\">" +

                        "Delete" +

                        "</button>" +

                        "</td>" +

                        "</tr>"

                    );

                }
            )
            .join("");


    container.innerHTML =

        "<table class='admin-table'>" +

        "<thead>" +

        "<tr>" +

        "<th>Name</th>" +
        "<th>Category</th>" +
        "<th>Price</th>" +
        "<th>Stock</th>" +
        "<th>Rx</th>" +
        "<th>Action</th>" +

        "</tr>" +

        "</thead>" +

        "<tbody>" +

        rows +

        "</tbody>" +

        "</table>";

}


// ============================================
// DELETE PRODUCT
// ============================================

async function deleteProduct(
    productId
) {

    if (
        !confirm(
            "Delete this product?"
        )
    ) {
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


        alert(
            "Product deleted successfully."
        );


        await loadAdminProducts();


    } catch (error) {

        console.error(
            "DELETE PRODUCT ERROR:",
            error
        );


        alert(
            "Unable to delete product.\n\n" +
            getErrorMessage(error)
        );

    }

}


// ============================================
// PRODUCT MODAL
// ============================================

function openProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    if (modal) {

        modal.classList.add(
            "active"
        );

    }

}


function closeProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


// ============================================
// ADD PRODUCT
// ============================================

async function addProduct() {

    const nameEl =
        document.getElementById(
            "productName"
        );

    const categoryEl =
        document.getElementById(
            "productCategory"
        );

    const descriptionEl =
        document.getElementById(
            "productDescription"
        );

    const priceEl =
        document.getElementById(
            "productPrice"
        );

    const discountEl =
        document.getElementById(
            "productDiscount"
        );

    const stockEl =
        document.getElementById(
            "productStock"
        );

    const imageEl =
        document.getElementById(
            "productImage"
        );

    const prescriptionEl =
        document.getElementById(
            "prescriptionRequired"
        );

    const message =
        document.getElementById(
            "productMessage"
        );


    if (
        !nameEl ||
        !categoryEl ||
        !priceEl ||
        !stockEl
    ) {

        console.error(
            "Product form elements missing."
        );

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
        Number(
            priceEl.value
        );

    const discountPrice =
        discountEl &&
        discountEl.value !== ""
            ? Number(
                discountEl.value
            )
            : null;

    const stock =
        Number(
            stockEl.value
        );

    const image =
        imageEl
            ? imageEl.value.trim()
            : "";

    const prescriptionRequired =
        prescriptionEl
            ? prescriptionEl.checked
            : false;


    if (message) {

        message.style.color =
            "#d22";

        message.textContent = "";

    }


    // Validation
    if (!name) {

        showProductError(
            "Please enter medicine name."
        );

        return;

    }


    if (!category) {

        showProductError(
            "Please select a category."
        );

        return;

    }


    if (
        Number.isNaN(price) ||
        price <= 0
    ) {

        showProductError(
            "Please enter a valid price."
        );

        return;

    }


    if (
        Number.isNaN(stock) ||
        stock < 0
    ) {

        showProductError(
            "Please enter a valid stock quantity."
        );

        return;

    }


    try {

        console.log(
            "Creating product..."
        );


        await tablesDB.createRow({

            databaseId:
                DATABASE_ID,

            tableId:
                PRODUCTS_TABLE_ID,

            rowId:
                Appwrite.ID.unique(),

            data: {

                name:
                    name,

                category:
                    category,

                description:
                    description,

                price:
                    price,

                discountPrice:
                    discountPrice,

                stock:
                    stock,

                image:
                    image,

                prescriptionRequired:
                    prescriptionRequired

            }

        });


        console.log(
            "Product created."
        );


        if (message) {

            message.style.color =
                "#087f5b";

            message.textContent =
                "Product added successfully!";

        }


        // Reset
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
            prescriptionEl.checked =
                false;
        }


        await loadAdminProducts();


        setTimeout(
            function () {

                closeProductModal();

            },
            800
        );


    } catch (error) {

        console.error(
            "CREATE PRODUCT ERROR:",
            error
        );


        showProductError(
            getErrorMessage(error)
        );

    }

}


// ============================================
// PRODUCT ERROR
// ============================================

function showProductError(
    messageText
) {

    const message =
        document.getElementById(
            "productMessage"
        );


    if (message) {

        message.style.color =
            "#d22";

        message.textContent =
            messageText;

    }

}


// ============================================
// LOAD ORDERS
// ============================================

async function loadOrders() {

    try {

        console.log(
            "Loading orders..."
        );


        const response =
            await tablesDB.listRows({

                databaseId:
                    DATABASE_ID,

                tableId:
                    ORDERS_TABLE_ID,

                total: true

            });


        adminOrdersCache =
            response.rows || [];


        adminOrdersCache.sort(
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


        console.log(
            "Orders loaded:",
            adminOrdersCache.length
        );


        renderOrdersTable(
            "recentOrders",
            adminOrdersCache.slice(
                0,
                6
            ),
            "dash"
        );


        renderOrdersTable(
            "adminOrders",
            adminOrdersCache,
            "orders"
        );


        updateDashboardStats();


        // Refresh selected order
        [
            "dash",
            "orders"
        ].forEach(
            function (context) {

                if (
                    selectedOrderId[
                        context
                    ]
                ) {

                    const order =
                        adminOrdersCache.find(
                            function (item) {

                                return (
                                    item.$id ===
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
            "LOAD ORDERS ERROR:",
            error
        );


        const html =
            "<div class='loading-state'>" +
            "<strong>Unable to load orders.</strong><br><br>" +
            escapeHTML(
                getErrorMessage(error)
            ) +
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
            recent.innerHTML =
                html;
        }

        if (all) {
            all.innerHTML =
                html;
        }

    }

}


// ============================================
// RENDER ORDERS
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


    if (!container) {
        return;
    }


    if (!orders.length) {

        container.innerHTML =
            "<div class='loading-state'>" +
            "No orders yet." +
            "</div>";

        return;

    }


    const rows =
        orders.map(
            function (order) {

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
                    String(
                        order.$id
                    ).slice(-6);


                const date =
                    order.$createdAt
                        ? new Date(
                            order.$createdAt
                        ).toLocaleDateString(
                            "en-IN"
                        )
                        : "—";


                const selected =
                    selectedOrderId[
                        context
                    ] === order.$id;


                return (

                    "<tr class='" +

                    (
                        selected
                            ? "row-selected"
                            : ""
                    ) +

                    "' onclick=\"selectOrder('" +

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

            }
        )
        .join("");


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
// SELECT ORDER
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
            function (item) {

                return (
                    item.$id ===
                    orderId
                );

            }
        );


    if (!order) {
        return;
    }


    renderStatusPanel(
        context,
        order
    );


    if (
        context ===
        "dash"
    ) {

        renderOrdersTable(
            "recentOrders",
            adminOrdersCache.slice(
                0,
                6
            ),
            "dash"
        );

    }


    if (
        context ===
        "orders"
    ) {

        renderOrdersTable(
            "adminOrders",
            adminOrdersCache,
            "orders"
        );

    }

}


// ============================================
// CLEAR STATUS PANEL
// ============================================

function clearStatusPanel(
    context
) {

    selectedOrderId[
        context
    ] = null;


    const ref =
        document.getElementById(

            context === "dash"
                ? "dashOrderRef"
                : "ordersOrderRef"

        );


    const actions =
        document.getElementById(

            context === "dash"
                ? "dashStatusActions"
                : "ordersStatusActions"

        );


    if (ref) {

        ref.textContent =
            "No order selected";

    }


    if (actions) {

        actions.innerHTML =
            "<div class='empty-state'>" +
            "Click any order row to update its status." +
            "</div>";

    }

}


// ============================================
// STATUS PANEL
// ============================================

function renderStatusPanel(
    context,
    order
) {

    const ref =
        document.getElementById(

            context === "dash"
                ? "dashOrderRef"
                : "ordersOrderRef"

        );


    const actions =
        document.getElementById(

            context === "dash"
                ? "dashStatusActions"
                : "ordersStatusActions"

        );


    if (!ref || !actions) {
        return;
    }


    const status =
        order.status ||
        "Pending";


    const shortId =
        String(
            order.$id
        ).slice(-6);


    ref.textContent =
        "Order ID: #" +
        shortId;


    if (
        status ===
        "Cancelled"
    ) {

        actions.innerHTML =
            "<div class='empty-state'>" +
            "This order was cancelled." +
            "</div>";

        return;

    }


    if (
        status ===
        "Delivered"
    ) {

        actions.innerHTML =
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


    if (
        currentIndex === 0
    ) {

        buttons.push(

            "<button " +
            "class='status-action-btn sa-confirm' " +

            "onclick=\"updateOrderStatus('" +

            escapeAttribute(
                order.$id
            ) +

            "','Confirmed','" +

            context +

            "')\">" +

            "✅ Confirm Order" +

            "</button>"

        );

    }


    if (
        currentIndex === 1
    ) {

        buttons.push(

            "<button " +
            "class='status-action-btn sa-packed' " +

            "onclick=\"updateOrderStatus('" +

            escapeAttribute(
                order.$id
            ) +

            "','Packed','" +

            context +

            "')\">" +

            "📦 Mark as Packed" +

            "</button>"

        );

    }


    if (
        currentIndex === 2
    ) {

        buttons.push(

            "<button " +
            "class='status-action-btn sa-delivery' " +

            "onclick=\"markOutForDelivery('" +

            escapeAttribute(
                order.$id
            ) +

            "','" +

            escapeAttribute(
                order.phone ||
                ""
            ) +

            "','" +

            escapeAttribute(
                order.customerName ||
                "Customer"
            ) +

            "','" +

            context +

            "')\">" +

            "🚚 Out for Delivery" +

            "</button>"

        );

    }


    if (
        currentIndex === 3
    ) {

        buttons.push(

            "<button " +
            "class='status-action-btn sa-delivered' " +

            "onclick=\"updateOrderStatus('" +

            escapeAttribute(
                order.$id
            ) +

            "','Delivered','" +

            context +

            "')\">" +

            "📬 Mark Delivered" +

            "</button>"

        );

    }


    buttons.push(

        "<button " +
        "class='status-action-btn sa-cancel' " +

        "onclick=\"cancelOrder('" +

        escapeAttribute(
            order.$id
        ) +

        "','" +

        context +

        "')\">" +

        "✕ Cancel Order" +

        "</button>"

    );


    actions.innerHTML =
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

        console.log(
            "Updating order:",
            orderId,
            newStatus
        );


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
            "UPDATE ORDER ERROR:",
            error
        );


        alert(
            "Unable to update order.\n\n" +
            getErrorMessage(error)
        );

    }

}


// ============================================
// CANCEL ORDER
// ============================================

function cancelOrder(
    orderId,
    context
) {

    if (
        !confirm(
            "Cancel this order?\n\nThis cannot be undone."
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
// OUT FOR DELIVERY
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
        " is out for delivery! 🚚 " +
        "It should reach you soon.";


    const phone =
        cleanPhoneForWhatsApp(
            customerPhone
        );


    if (!phone) {
        return;
    }


    window.open(

        "https://wa.me/" +
        phone +
        "?text=" +
        encodeURIComponent(
            message
        ),

        "_blank"

    );

}


// ============================================
// WHATSAPP PHONE
// ============================================

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


    if (
        digits.length ===
        10
    ) {

        digits =
            "91" +
            digits;

    }


    return digits;

}


// ============================================
// ERROR MESSAGE
// ============================================

function getErrorMessage(
    error
) {

    if (!error) {
        return "Unknown error";
    }


    if (
        error.message
    ) {

        return error.message;

    }


    try {

        return JSON.stringify(
            error
        );

    } catch (e) {

        return String(
            error
        );

    }

}


// ============================================
// ESCAPE HTML
// ============================================

function escapeHTML(
    value
) {

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


// ============================================
// ESCAPE ATTRIBUTE
// ============================================

function escapeAttribute(
    value
) {

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
// GLOBAL FUNCTIONS
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

window.loadAdminProducts =
    loadAdminProducts;

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
    "✅ PharmaCare Admin JS ready"
);
