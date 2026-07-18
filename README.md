# Nova Shop — Full-Stack E-Commerce Project

Nova Shop is an e-commerce application. It has a customer storefront and a backend API connected to a real SQLite database.

Live Link : https://novashop-yusuf.duckdns.org/ 

## What has been built

- Customer account registration and sign-in
- Password hashing and signed login sessions
- Searchable, filterable product catalogue
- Premium product detail view with an image gallery and verified customer reviews
- Browser-persisted wishlist for saved products
- Account-specific cart and wishlist records stored in SQLite
- Stock-aware shopping bag saved in the browser
- Checkout with delivery information and cash-on-delivery or demo payment option
- Automatic order creation, order references, and stock reduction
- Customer order history
- Admin dashboard: sales overview, recent orders, stock updates, and adding products
- SQLite database created automatically at `data/nova-shop.db`

## Run it on Windows (Command Prompt)

You are using **Command Prompt** when you see a prompt like `C:\Users\...>`. In the project directory, run:

```cmd
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

If another application uses that port, use:

```cmd
set PORT=3001 && npm start
```

Then open [http://localhost:3001](http://localhost:3001).

To stop the site, return to Command Prompt and press `Ctrl + C`.

## First test of the customer flow

1. Open the site and add products to **Bag**.
2. Click **Checkout**. You will be asked to create an account or sign in.
3. Complete the delivery form and place the order.
4. Open the account panel and choose **View my orders**. Your new order appears there.
5. Restarting the server does not remove products, accounts, or orders—the SQLite database retains them.

## Admin dashboard

The demonstration administrator account is:

```text
Email:    admin@novashop.local
Password: Admin@12345
```

Sign in with it and choose **Open admin dashboard** from the account panel. You can inspect orders, edit stock quantities, and add products.

**For your project demonstration:** use these credentials only on your own computer. Before putting the project online, remove or replace this default account and set a secure session secret.

## Project structure

| File or folder | Purpose |
| --- | --- |
| `public/index.html` | Customer-facing page structure |
| `public/styles.css` | Responsive visual design |
| `public/app.js` | Browser logic: account, bag, checkout, dashboard |
| `server.js` | Backend API, authentication, orders, admin logic |
| `data/nova-shop.db` | SQLite database, created on first run |

## Features to demonstrate to your examiners

1. Register a new customer account.
2. Search and filter the catalogue.
3. Add products to the bag; change their quantities.
4. Place an order. Explain that the database transaction reduces stock at the same time as it creates the order.
5. Sign in as the admin and show the order dashboard and stock update.
6. Stop and restart the server, then show the saved order again to demonstrate database persistence.

## Important deployment checklist

The project works as a complete demonstration. A public commercial shop needs these additional steps before real customers use it:

1. Set a long, random session secret before starting the server:

   ```cmd
   set SESSION_SECRET=put-a-long-random-value-here && npm start
   ```

2. Replace the default administrator credentials and add a password-reset flow.
3. Deploy behind HTTPS, using a managed host such as Render, Railway, or an institution server.
4. Use a managed SQL database (PostgreSQL/MySQL) for a multi-user deployment; SQLite is excellent for local projects and small single-server demos.
5. Integrate a payment provider such as Stripe or Razorpay. Do not collect, transmit, or save card numbers yourself. The present **demo card payment** choice intentionally records a demo payment only; cash on delivery is the functional non-card option.
6. Add email confirmation, shipping-provider integration, image uploads, product reviews, returns, privacy policy, and rate limiting as the store grows.

## Suggested report title

**Design and Development of a Secure Full-Stack E-Commerce Platform Using Node.js and SQLite**

For your report, describe the three layers: browser frontend, Node.js REST API/backend, and SQLite relational database. The tables are `users`, `products`, `orders`, and `order_items`.

## Docker: run the deployment version locally

Docker Desktop must be running. From **Command Prompt** in this folder:

```cmd
docker compose up --build
```

Open `http://localhost:8080`. The app data is kept in a named Docker volume, so it survives restarting the container on your own computer.

Stop it with:

```cmd
docker compose down
```

The health endpoint used by deployment tools is `http://localhost:8080/health`.

## Deploy to AWS Elastic Beanstalk (beginner steps)

This repository is ready for a **single-container Docker** Elastic Beanstalk environment. The `Dockerfile` builds the application, while `.ebextensions/01-healthcheck.config` documents the `/health` health check.

### Important database note

The current SQLite database is appropriate for a college demo or a single server. Elastic Beanstalk can replace its EC2 instance during deployments or scaling, which means a container-local SQLite database can be reset. For a genuine public production shop, migrate the data layer to Amazon RDS (PostgreSQL/MySQL) before scaling beyond one instance.

### 1. Create the deployment ZIP

Ensure Docker works locally first. Then run this in **Command Prompt**:

```cmd
tar -a -c -f nova-shop-eb.zip Dockerfile package.json server.js public .ebextensions
```

The ZIP must contain `Dockerfile`, `package.json`, `server.js`, `public/`, and `.ebextensions/` directly at its top level—not inside another parent folder.

### 2. Create the Elastic Beanstalk application

1. Sign in to the [AWS Elastic Beanstalk console](https://console.aws.amazon.com/elasticbeanstalk/).
2. Select a nearby AWS Region, such as Mumbai (`ap-south-1`). Keep the same Region for all future resources.
3. Choose **Create application**.
4. Application name: `nova-shop` (or your preferred unique name).
5. Environment tier: **Web server environment**.
6. Platform: **Docker** and select the current **Docker running on 64bit Amazon Linux 2023** branch offered by AWS.
7. Under Application code, choose **Upload your code**, then select `nova-shop-eb.zip`.
8. Choose **Configure more options**. For a demo, select a **Single instance** environment to control cost.
9. In **Software**, add these environment properties:

   | Name | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |
   | `DATABASE_PATH` | `/app/data/nova-shop.db` |
   | `SESSION_SECRET` | a long random value you create and keep private |
   | `ADMIN_NAME` | your preferred administrator name |
   | `ADMIN_EMAIL` | administrator email address |
   | `ADMIN_PASSWORD` | strong administrator password |

10. In **Monitoring**, set the health check path to `/health` if the console shows that setting.
11. Review, then choose **Create app**. Wait until environment health turns green and open the generated URL.

AWS can upload Docker source bundles from the console, and its current Docker platform supports custom images built from a Dockerfile. See the [AWS Docker deployment guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/single-container-docker-configuration.html) and [environment creation guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-create-wizard.html).

### 3. Update later

1. Make and test a change locally with `docker compose up --build`.
2. Recreate `nova-shop-eb.zip` with the command above.
3. Open your Elastic Beanstalk environment, choose **Upload and deploy**, select the new ZIP, and confirm.
4. Check the **Events** and **Logs** pages if health does not become green.

### 4. Avoid unexpected AWS cost

When your demonstration is finished, open the Elastic Beanstalk environment and choose **Actions → Terminate environment**. This removes the associated environment resources. Always verify in the Billing console afterwards.

## Push to GitHub

### 1. Create the repository online

1. Go to [GitHub](https://github.com/new) while signed in.
2. Name it `nova-shop`.
3. Choose **Private** if this is a college submission.
4. Do **not** add a README, `.gitignore`, or license there; this project already has those.
5. Click **Create repository** and copy the HTTPS URL it shows.

### 2. Push this project

This project is already initialized and committed locally. In **Command Prompt**, run the following from this folder. Replace `YOUR-USERNAME` with your GitHub username:

```cmd
git remote add origin https://github.com/YOUR-USERNAME/nova-shop.git
git push -u origin main
```

GitHub may open a browser window for sign-in. Approve it, then return to Command Prompt. Your database file, `.env`, Docker volume data, and Elastic Beanstalk local settings are excluded by `.gitignore`.
