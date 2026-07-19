# ✦ Nova Shop

### A modern full-stack e-commerce platform built for thoughtful everyday shopping.

<p align="center">
  <strong>Discover. Save. Shop. Enjoy.</strong>
</p>

<p align="center">
  <a href="https://novashop-yusuf.duckdns.org/">🌐 Live Demo</a>
  •
  <a href="https://github.com/YusufKhan040/nova-shop">💻 GitHub Repository</a>
</p>

---

## 🛍️ About Nova Shop

**Nova Shop** is a full-stack e-commerce web application designed to deliver a modern, elegant, and frictionless online shopping experience.

The platform allows customers to discover products, explore product details, save favourites, manage their shopping bag, create accounts, complete orders, and track their purchase history.

Behind the polished storefront is a complete application architecture with authentication, database persistence, stock-aware checkout logic, order transactions, and role-based administrative controls.

> **22 products • Customer accounts • Saved carts • Wishlists • Checkout • Order history • Admin controls**

---

## ✨ Features

### 🛒 Customer Experience

* Browse a curated product catalogue
* Search products instantly
* Filter products by category
* Sort products by price
* View product details and image galleries
* Check stock availability
* Add products to the shopping bag
* Save products to a personal wishlist
* Move wishlist items to the shopping bag
* Create and manage customer accounts
* Complete the checkout process
* View order history and order details

### 👤 Account Management

Each authenticated user receives their own personal shopping state.

* Secure user registration and login
* Account-specific carts
* Account-specific wishlists
* Persistent order history
* Session-based authentication

### 💳 Checkout & Order Processing

Nova Shop implements realistic commerce logic rather than a simple static checkout flow.

The checkout workflow includes:

```text
Browse
   ↓
Save / Add to Bag
   ↓
Sign In
   ↓
Enter Delivery Details
   ↓
Validate Order
   ↓
Check Stock
   ↓
Calculate Total
   ↓
Create Order
   ↓
Reduce Stock
```

Stock is validated before an order is created, helping prevent orders from exceeding available inventory.

### 🛠️ Admin Dashboard

Administrators can manage important store operations through a role-based dashboard.

* View store health metrics
* View recent orders
* Monitor revenue metrics
* Identify low-stock products
* Update product stock quantities
* Add new products
* Manage the live product catalogue

---

## 🏗️ System Architecture

Nova Shop follows a simple three-layer architecture:

```text
┌──────────────────────────────┐
│        Frontend              │
│   HTML • CSS • JavaScript    │
│   Responsive User Interface  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Node.js Backend        │
│   REST-style JSON API        │
│   Authentication             │
│   Checkout Logic             │
│   Stock Management           │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        SQLite Database       │
│ Users • Products • Orders    │
│ Carts • Wishlists • Reviews  │
└──────────────────────────────┘
```

---

## 🗄️ Database Design

The application uses SQLite with relational tables for persistent data storage.

| Table             | Purpose                               |
| ----------------- | ------------------------------------- |
| `users`           | Customer identity and roles           |
| `products`        | Product catalogue and stock           |
| `cart_items`      | User shopping bag items               |
| `wishlist_items`  | Saved customer favourites             |
| `orders`          | Delivery information and order totals |
| `order_items`     | Individual order line items           |
| `product_reviews` | Ratings and customer reviews          |

Foreign keys and transactional order processing help maintain data consistency.

---

## 🔐 Security & Reliability

Nova Shop includes practical security and reliability measures:

* Password hashing using `scrypt`
* HMAC-signed sessions
* Server-side input validation
* Role-based admin access
* SQLite foreign key constraints
* Atomic checkout transactions
* Stock-aware order processing
* Persistent database storage

---

## 🧰 Tech Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript
* Responsive design
* Google Fonts

### Backend

* Node.js
* Express.js
* REST-style JSON API

### Database

* SQLite

### Deployment

* Docker
* AWS EC2
* Nginx
* Elastic IP
* DuckDNS
* Let's Encrypt HTTPS

---

## 🚀 Deployment Architecture

The production deployment follows this flow:

```text
User Browser
     │
     ▼
HTTPS
     │
     ▼
DuckDNS Domain
     │
     ▼
Nginx Reverse Proxy
     │
     ▼
AWS EC2 Instance
     │
     ▼
Docker Container
     │
     ▼
Node.js + Express
     │
     ▼
SQLite Database
```

The application is containerized with Docker and deployed on AWS EC2.

The Docker container uses a persistent volume for the SQLite database, allowing application containers to be rebuilt or replaced without losing stored application data.

The container is configured with:

```text
restart: unless-stopped
```

This allows the application to automatically restart after an EC2 reboot.

---

## 🖥️ Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/YusufKhan040/nova-shop.git
cd nova-shop
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the application

```bash
npm start
```

The application will be available at:

```text
http://localhost:8080
```

---

## 🐳 Run with Docker

Build the Docker image:

```bash
docker build -t nova-shop .
```

Run the container:

```bash
docker run -d \
  --name nova-shop \
  --restart unless-stopped \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e SESSION_SECRET="your-secure-session-secret" \
  -e DATABASE_PATH=/app/data/nova-shop.db \
  -v nova-shop-data:/app/data \
  nova-shop
```

---

## 📁 Project Structure

```text
nova-shop/
│
├── public/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── extras.css
│   ├── improvements.css
│   ├── overhaul.css
│   ├── account-features.css
│   ├── wishlist.css
│   └── image-fit.css
│
├── data/
│   └── nova-shop.db
│
├── server.js
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🔄 Deployment Workflow

Updates can be deployed from GitHub to the AWS EC2 server using:

```text
GitHub
   ↓
git pull
   ↓
Docker image rebuild
   ↓
Old container replaced
   ↓
New container started
   ↓
Nginx continues serving traffic
```

Example deployment:

```bash
cd ~/nova-shop-new
git pull
docker build -t nova-shop:new .
docker stop nova-shop
docker rm nova-shop
docker run -d \
  --name nova-shop \
  --restart unless-stopped \
  -p 8080:8080 \
  nova-shop:new
```

The database remains persistent through the Docker volume:

```text
nova-shop-data
```

---

## 🌐 Live Project

### 🚀 Live Demo

https://novashop-yusuf.duckdns.org/

### 💻 GitHub Repository

https://github.com/YusufKhan040/nova-shop

---

## 🎯 Project Goals

Nova Shop was built as a practical full-stack web development project to explore:

* Modern e-commerce user experience
* Frontend and backend integration
* REST-style API design
* Authentication and sessions
* Relational database design
* Transactional checkout logic
* Stock management
* Docker containerization
* AWS EC2 deployment
* Nginx reverse proxy configuration
* HTTPS certificate setup
* Production deployment workflows

---

## 🔮 Future Improvements

Potential future enhancements include:

* Online payments with Stripe or Razorpay
* Managed cloud SQL database
* Product image uploads
* Advanced product reviews
* Email order confirmations
* Delivery tracking integration
* CI/CD deployment with GitHub Actions
* Cloud monitoring and logging
* Product recommendations

---

## 👨‍💻 Author

### Yusuf Khan

**B.Tech — Information Technology**

IBM Web Development Project • 2026

---

<p align="center">
  <strong>Nova Shop — Everyday goods, thoughtfully chosen.</strong>
</p>

<p align="center">
  ⭐ If you like this project, consider giving the repository a star!
</p>
