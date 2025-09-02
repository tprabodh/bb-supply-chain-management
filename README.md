# Supply Chain Management App

This project is a comprehensive Supply Chain Management application built with React. It manages the entire workflow from sales forecasting to final product distribution. The application features a robust role-based access control system, ensuring that each user has access only to the functionalities relevant to their role.

## Recent Updates

### 1. Firebase Project Migration
- The Firebase project has been migrated to a new, dedicated email address for better ownership and transferability. The application now connects to this new Firebase project.

### 2. Enhanced User Authentication
- User authentication has been refactored to use Firebase Authentication for secure sign-up and sign-in.
- Passwords are no longer stored directly in the Firestore `profiles` collection, significantly enhancing security.
- The login UI remains unchanged, allowing users to select their role and subrole, with the email being derived internally for Firebase Authentication.

### 3. Hierarchical Employee Code (empCode) Generation
- A new `empCode` field is now generated for each user upon creation, reflecting their hierarchical position in the organization.
- The `empCode` follows a structured format (e.g., `CH1ZH1TL1SE2`), indicating the user's role and their position under their respective managers up to the City Operations Head.
- **Example:**
    - `A1`: First Admin
    - `BH1`: First Business Head
    - `CH1`: First City Operations Head
    - `CH1ZH1`: First Zonal Head under `CH1`
    - `CH1ZH1TL1`: First Team Lead under `CH1ZH1`
    - `CH1ZH1TL1SE1`: First Sales Executive under `CH1ZH1TL1`

### 4. Role-based "Reports To" Locking
- The "Reports To" field, both during profile creation and when updating in the organizational chart, is now strictly controlled based on the user's role.
- This ensures that employees can only report to valid managers according to the defined organizational hierarchy.

### 5. Dynamic empCode Update and Reordering in Organizational Chart
- When an employee's manager (`reportsTo`) is changed in the organizational chart, their `empCode` is automatically regenerated to reflect their new position.
- Furthermore, the `empCode`s of other employees under the old manager are reordered to maintain sequential numbering (e.g., if `CH1ZH1TL1` moves, `CH1ZH1TL2` becomes `CH1ZH1TL1`).
- **Note:** While this reordering logic is currently implemented client-side, it is highly recommended to migrate this complex operation to a Firebase Cloud Function in the future for improved reliability and data integrity.

### 6. Standardized Date Format
- All dates displayed throughout the application now adhere to the `dd-mm-yyyy` format for consistency.

## Project Structure

The project is organized as follows:

- **/public**: Contains the main HTML file and static assets like images and icons.
- **/src**: Contains the main source code for the application.
  - **/api**: (Not yet implemented) Intended for API-related logic.
  - **/assets**: Contains static assets like images and icons.
  - **/components**: Contains reusable React components used throughout the application (e.g., Modals, Loaders).
  - **/constants**: (Not yet implemented) Intended for constant values used throughout the application.
  - **/contexts**: Contains React Context providers for managing global state (e.g., `AuthContext`).
  - **/hooks**: (Not yet implemented) Intended for custom React hooks.
  - **/pages**: Contains the main pages of the application, organized by role.
  - **/routes**: (Not yet implemented) Intended for route definitions.
  - **/services**: Contains services for interacting with backend systems like Firebase (e.g., `forecastService`, `kitchenService`).
  - **/styles**: (Not yet implemented) Intended for global styles.
  - **/utils**: (Not yet implemented) Intended for utility functions.

## Implemented Functionality

### 1. Core Features
- **User Authentication & Authorization:** Secure login/logout for all roles. Access to pages and features is strictly restricted based on the user's assigned role.
- **Profile Management (Admin):** Admins can create, view, and edit employee profiles.
- **Organization Chart (Admin):** A visual representation of the company hierarchy.
- **Recipe Management (Admin):** Admins can define recipes for food items, which are used for automatic ingredient calculation.

### 2. Forecasting & Approval
- **Zonal Head:** Can create and submit weekly sales forecasts for their respective team leads.
- **Finance & Accounts:** Can review pending weekly forecasts, modify quantities if necessary, and approve or reject them.

### 3. Daily Operations
- **Daily Target Setting (Zonal Head):** Zonal Heads set daily sales targets for each of their team leads, based on the approved weekly forecast.
- **Automated Procurement Requests:** Upon weekly forecast approval, a procurement request with a calculated list of required ingredients is automatically generated.
- **Procurement (Procurement Manager):** Views pending procurement requests and marks them as "Purchased".
- **Stock Management (Stock Manager):** Views purchased items, confirms their receipt into a dedicated `stock` collection, and disperses ingredients to kitchens based on daily cooking assignments.
- **Daily Kitchen Assignments (Admin):** Admins assign daily cooking tasks to different kitchens based on the aggregated daily targets.
- **Kitchen Operations (Kitchen Manager):** Can view their assigned daily cooking tasks, confirm receipt of ingredients, and submit the final cooked quantities.
- **Logistics & Distribution (Logistics Manager & Team Lead):** The logistics manager collects cooked food from kitchens, and team leads confirm receipt of deliveries.

## Project Flow

This application orchestrates the entire supply chain, from weekly sales forecasting to daily execution and final delivery. The workflow is divided into several key stages:

### 1. Recipe Management (Admin)
- The Admin defines the ingredients and quantities required for each food item, along with the item's MRP, selling price, description, and a picture. This serves as the foundation for all procurement and cooking calculations.

### 2. Weekly Forecasting and Approval (Zonal Head & Finance)
- A Zonal Head submits a single, locked-in sales forecast for the upcoming week (Monday to Sunday), detailing the total number of food units each Team Lead is projected to sell.
- The weekly forecast is sent to the Finance & Accounts department for review and approval.

### 3. Procurement (Procurement Manager & Stock Manager)
- Upon weekly forecast approval, the system automatically calculates the ingredients needed. It first checks the `preparedStock` for any ready-made items and then checks the `stock` for raw ingredients. 
- A procurement request is generated only for the ingredients that are actually needed after accounting for both prepared and raw stock. The Procurement Manager buys the ingredients.
- The Stock Manager confirms receipt of the ingredients, and the quantities are added to the central `stock` collection.

### 4. Daily Target Setting (Zonal Head)
- Every day, the Zonal Head sets a daily sales target for each of their Team Leads. This target is a portion of the approved weekly forecast.
- The system tracks the remaining weekly forecast to ensure that the sum of daily targets does not exceed the weekly forecast.

### 5. Daily Kitchen Operations (Admin, Stock & Kitchen Managers)
- The system aggregates the daily targets from all Team Leads to determine the total amount of each food item to be cooked for that day.
- The Admin assigns these daily cooking tasks to various kitchens.
- The Stock Manager dispatches the required ingredients to the individual kitchens, and the quantities are deducted from the `stock` collection.
- The Kitchen Manager confirms receipt of the ingredients and, after cooking, reports the actual quantity of food produced.

### 6. Daily Logistics and Distribution (Logistics Manager & Team Lead)
- The Logistics Manager collects the cooked food from all kitchens.
- They distribute the food to the various Team Leads based on the daily targets.
- Each Team Lead confirms receipt of the food, completing the daily cycle.

### 7. Stock Back (Team Lead, Logistics Manager & Stock Manager)
- At the end of the day, the Team Lead initiates a "stock back" request for any unsold food items from their sales executives.
- The Logistics Manager views these requests, confirms the pickup of the items, and marks them as "Ready for Restock".
- The Stock Manager then sees the items ready for restock, confirms receipt, and the system automatically updates the central `stock` collection with the returned ingredients based on the item's recipe.

### 8. Spoilage Reporting (Stock Manager)
- The Stock Manager can report spoiled or expired ingredients and prepared food items directly from their dashboard.
- For each item in the "Current Stock" and "Prepared Stock" tables, there is an input field to enter the quantity of spoiled items and a "Report" button.
- When spoilage is reported, the quantity is deducted from the corresponding stock (`stock` or `preparedStock` collection).
- A new document is created in the `spoilageLog` collection to record the details of the spoilage event, including the item name, quantity, the stock manager who reported it, and the timestamp.

## Firestore Database Schema

This document outlines the structure of the shared Firestore database used by the Customer App, Vendor App, and the Supply Chain Management App.

### Core Collections

#### `profiles`
- **Purpose:** Manages user profiles for the `supply-chain-management-app`, including their roles and permissions.
- **Fields:**
    - `uid`: (string) The user's unique ID from Firebase Authentication.
    - `email`: (string) The user's email.
    - `role`: (string) The primary role of the user (e.g., "Finance", "Logistics Manager").
    - `subrole`: (string) A more specific sub-role, if applicable.
    - `reportsTo`: (string) The document ID of the user's manager in the `profiles` collection.
    - `empCode`: (string) A unique hierarchical employee code.

#### `recipes`
- **Purpose:** Stores the recipes for food items, detailing the required ingredients and quantities.

#### `stock`
- **Purpose:** Stores the current inventory of each ingredient.
- **Document ID:** The name of the ingredient.
- **Fields:**
    - `quantity`: (number) The current quantity of the ingredient in stock.
    - `unit`: (string) The unit of measurement for the ingredient (e.g., "kg", "liters").

#### `preparedStock`
- **Purpose:** Stores the current inventory of fully cooked/prepared items that have been returned via the stock back flow.
- **Document ID:** The name of the prepared item.
- **Fields:**
    - `quantity`: (number) The current quantity of the prepared item in stock.
    - `returnedAt`: (Timestamp) The date the item was returned to stock.

#### `spoilageLog`
- **Purpose:** Logs all spoilage events for ingredients and prepared food.
- **Fields:**
    - `itemId`: (string) The ID of the spoiled item.
    - `itemName`: (string) The name of the spoiled item.
    - `itemType`: (string) The type of item ('ingredient' or 'preparedStock').
    - `quantity`: (number) The quantity that was spoiled.
    - `stockManagerId`: (string) The ID of the stock manager who reported the spoilage.
    - `reportedAt`: (Timestamp) The timestamp of when the spoilage was reported.

### Transactional Collections

#### `forecasts`
- **Purpose:** Stores the weekly sales forecasts submitted by Zonal Heads.
- **Fields:**
    - `zonalHeadId`: (string) The document ID of the Zonal Head who submitted the forecast.
    - `teamLeadId`: (string) The document ID of the Team Lead for whom the forecast is being submitted.
    - `forecastWeek`: (string) The start date of the week for which the forecast is being submitted (in `dd-mm-yyyy` format).
    - `items`: (array) A list of items in the forecast, including item name, recipe ID, and quantity.
    - `status`: (string) The status of the forecast (e.g., "Pending", "Approved", "Rejected").
    - `createdAt`: (Timestamp) The time the forecast was submitted.

#### `dailyTargets`
- **Purpose:** Stores the daily sales targets set by Zonal Heads for their Team Leads.
- **Document ID:** `${teamLeadId}_${date}` (e.g., "someTeamLeadId_21-08-2025")
- **Fields:**
    - `zonalHeadId`: (string) The document ID of the Zonal Head.
    - `teamLeadId`: (string) The document ID of the Team Lead.
    - `date`: (string) The date for which the target is being set (in `dd-mm-yyyy` format).
    - `items`: (array) A list of items in the target, including item name, recipe ID, and quantity.

#### `procurementRequests`
- **Purpose:** Manages requests for procuring new ingredients based on approved weekly forecasts.

#### `cookingAssignments`
- **Purpose:** Manages the assignment of daily cooking tasks to different kitchens.
- **Fields:**
    - `date`: (string) The date for which the assignment is being made (in `dd-mm-yyyy` format).
    - `kitchenId`: (string) The document ID of the kitchen.
    - `kitchenName`: (string) The name of the kitchen.
    - `kitchenManagerId`: (string) The document ID of the Kitchen Manager.
    - `items`: (array) A list of items to be cooked, including item name, recipe ID, and quantity.
    - `status`: (string) The status of the assignment (e.g., "Pending Dispersal", "Dispersed", "Ingredients Received", "Completed").
    - `completedAt`: (Timestamp) The time the assignment was completed.
    - `forecastId`: (string) The ID of the weekly forecast this assignment is derived from.
    - `forecastWeek`: (string) The start date of the forecast week this assignment is derived from.

#### `distributions`
- **Purpose:** Tracks the distribution of cooked food to sales teams.

#### `logisticsInventory`
- **Purpose:** Manages the inventory of the logistics team.
- **Document ID:** The name of the ingredient.
- **Fields:**
    - `quantity`: (number) The current quantity of the ingredient in logistics inventory.
    - `unit`: (string) The unit of measurement for the ingredient.

## New Features Implemented

This section outlines the key new functionalities added to the application:

### 1. Enhanced Team Lead Dashboard
- **Sales Data Overview:** Team Leads can now view the sales performance of all Sales Executives under them. This data is presented in separate, collapsible tables for each Sales Executive, with filtering options for various time periods (Today, This Week, Last Week, This Month, Last Month, Till Now).

### 2. Streamlined Zonal Head Dashboard
- **Weekly Forecast Submission:** Zonal Heads now submit a single, locked-in weekly forecast for all their Team Leads for the upcoming week. Once submitted, this forecast cannot be changed.
- **Daily Target Setting:** Zonal Heads can set daily sales targets for each Team Lead, based on the approved weekly forecast.
- The system tracks the remaining weekly forecast to ensure that the sum of daily targets does not exceed the weekly forecast.
- **Forecast vs. Actual Sales Analysis:** A new section provides a detailed comparison of weekly forecasted sales against actual sales for each Team Lead and item, helping Zonal Heads assess forecast accuracy.

### 3. Comprehensive City Operations Head Dashboard
- **Aggregated Sales Data:** City Operations Heads can view aggregated sales data for all Zonal Heads and Team Leads under their purview, presented in collapsible tables.
- **Kitchen Manager Metrics:** A new section displays key performance indicators for Kitchen Managers, including assigned cooking quantities, actual cooked quantities, and completion times.
- **Business Insights:** Visual insights are provided through charts, including:
    - **Sales vs. Forecast:** A bar chart comparing overall forecasted sales with actual sales.
    - **Top Selling Items:** A pie chart highlighting the top 5 best-selling food items.
    - **Sales Trends:** A line chart illustrating sales performance over time.
- **Operational Overviews:** Displays pending forecasts, active procurements, and ongoing kitchen assignments, similar to the Admin Dashboard.

### 4. Advanced Stock Manager Dashboard
- **Centralized Stock Management:** The system now uses a dedicated `stock` collection for real-time inventory tracking of all ingredients.
- **Streamlined Receipt & Dispersal:** When stock is received, it's added to the `stock` collection. When ingredients are dispersed to kitchens, they are deducted from this central stock.
- **Cumulative Procurement List:** The dashboard shows a cumulative list of all ingredients to be purchased based on pending procurement requests.

### 5. Enhanced Kitchen Manager Dashboard
- **Cooked Food History:** Kitchen Managers can view a history of all food cooked, filtered by various time periods.
- **Real-time Kitchen Inventory:** A new section displays the current inventory of ingredients within the kitchen, allowing Kitchen Managers to report wastage.

### 6. HR Dashboard Enhancements
- **Subordinate Sales Data:** HR users can select any Zonal Head, Team Lead, or Sales Executive under their City Operations Head and view their detailed sales data, complete with time-based filtering.

## Getting Started

In the project directory, you can run:

### `npm install`
Installs all necessary project dependencies.

### `npm start`
Runs the app in the development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.
You may also see any lint errors in the console.

### `npx tailwindcss -i ./src/index.css -o ./src/output.css --watch`
This command compiles your Tailwind CSS. It should be run in parallel with `npm start` to ensure your styles are correctly applied and updated as you make changes.

### `npm test`
Launches the test runner in the interactive watch mode.

### `npm run build`
Builds the app for production to the `build` folder.

### `npm run eject`
**Note: this is a one-way operation. Once you `eject`, you can't go back!**

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
#   b b - s u p p l y - c h a i n - m a n a g e m e n t  
 