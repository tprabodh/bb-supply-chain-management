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

### 7. Centralized Sales Executive & Vendor Management
- The registration and management of Sales Executives (formerly handled by the separate Vendor App) is now centralized within the SCM app. Admins can create Sales Executive profiles, which automatically creates corresponding documents in both the `profiles` and `vendors` collections.
- The `empCode` is now also stored in the `vendors` collection.
- The old "Sync Vendors" feature has been removed.

### 8. Vendor App Updates
- The Vendor App login has been updated to use `empCode` and password, aligning with the SCM app.
- The Vendor App's home screen has been restructured to prioritize stock management, with other sections like "Blocked Orders" and "Generate Invoice" accessible from the home screen.
- The "Shift Stock" feature in the Vendor App now uses `empCode` to identify the recipient vendor.

### 9. Enhanced Invoice Generation (Vendor App)
- A new feature for invoicing non-registered customers has been added.
- A new `non-registered-customers` collection has been created to store the details of these customers for future use.
- An autocomplete feature has been added to the customer name field to suggest previously entered non-registered customers.
- The app now generates a PDF invoice and prepares it for sending via email.

### 10. Advanced Recipe & Ingredient Management
- A new **Ingredient Management** system has been created for Admins to register master ingredients with a name, unit of measurement, and cost per unit.
- The **Recipe Management** feature has been enhanced:
  - The ingredient name field now provides autocomplete suggestions from the master ingredients list.
  - The ingredient's unit is autofilled upon selection.
  - The cost for each ingredient is automatically calculated based on the quantity and the master cost, and is stored with the recipe.
  - Recipes now include a field for an **Image URL**.
  - A multi-tiered **Incentive** system has been added to each recipe, allowing for different incentive percentages based on sales volume.

### 11. Latest Bug Fixes and Enhancements

#### Vendor App
- **Home Screen Stability:** Implemented a robust daily stock history snapshot mechanism using `WidgetsBindingObserver`. The `_performDailyCheck` function now reliably saves the previous day's stock data to `vendor_stock_history` and resets daily counters. The `StreamBuilder` in `home_screen.dart` was refactored to correctly handle all connection and data states (waiting, error, no data/document not found) and prevent infinite loading.
- **Sale Records Page:**
  - Added display for user's salary.
  - Implemented a new weekly incentive table at the top of the screen.
  - Calculates "incentivized units" based on item type (jar = 25 units, sachet = 1 unit).
  - Calculates tiered incentives based on the "pickle" item's selling price and incentive tiers.
  - The daily sales records list remains, with updated daily incentive calculations.

#### Supply Chain Management App Enhancements:
- **Admin Business Details:** Implemented a new "Business Details" section in the Admin Dashboard for managing core business information (name, GSTIN, phone, email, address, FSSAI).
- **Bulk Buy Order Workflow:** Developed a comprehensive new flow for bulk ingredient procurement:
    - **City Operations Head (COH):** Can now create and submit bulk buy orders with specific ingredients and quantities, including real-time cost calculation.
    - **Finance:** Gains a new section to review, edit quantities, and approve/reject COH-submitted bulk buy orders.
    - **Procurement Manager:** Can view approved bulk buy orders and mark them as "Purchased."
    - **Stock Manager:** Can confirm receipt of purchased bulk buy orders, which automatically updates the central stock inventory.
    - **Bug Fix:** Corrected an issue in `confirmBulkBuyOrderReceipt` to properly aggregate quantities for duplicate ingredients in a single order, preventing data overwrites.
- **Forecasting Flow Overhaul:** Initiated a major restructuring of the forecasting process:
    - **Sales Executive Forecasts:** Sales Executives now input weekly forecasts by providing daily quantity breakdowns for each item. The total weekly forecast is automatically calculated from these daily entries.
    - **Team Lead Forecast View:** Team Leads can now view the aggregated weekly forecasts submitted by their Sales Executives.
    - **Zonal Head Forecast View:** Zonal Heads can view aggregated weekly forecasts from their Team Leads, with an expandable option to see the Sales Executive daily breakdown.
    - **Stock Manager Forecast Approval:** Stock Managers now receive aggregated forecasts from Zonal Heads for approval or rejection. They cannot modify quantities.
    - **Finance Forecast Acceptance:** Finance receives forecasts after Stock Manager approval for final acceptance.
    - **Procurement Trigger:** Procurement requests are now triggered upon Finance's final acceptance of the forecast.
- **Sales Executive (SE) Dashboard Enhancements:**
  - **Forecast Editability:** SEs can now edit and update their submitted forecasts as long as the Stock Manager has not yet accepted them (statuses: `Draft`, `Rejected by Stock Manager`, `Pending Stock Manager Approval`).
  - **Streamlined Submission:** The "Save" button has been renamed to "Update". The "Submit" button has been removed; updating a draft or rejected forecast automatically sets its status to `Pending Stock Manager Approval`.
  - **Consistent Date Display:** All displayed forecast dates now consistently adhere to the `dd-mm-yyyy` format.
- **Stock Manager (SM) Dashboard Enhancements:**
  - **Aggregated Forecast Approval:** SMs now receive aggregated forecasts from Zonal Heads for approval or rejection, displaying Zonal Head `empCode` and name. Approval/rejection applies to all individual forecasts under that Zonal Head.
  - **Kitchen Assignment:** SMs are now responsible for assigning daily cooking tasks to different kitchens based on aggregated daily targets.
  - **Cooked Food Collection:** SMs confirm collection of cooked food from kitchens (status: `Pending Stock Manager Collection`) and mark it `Ready for Logistics Collection`.
- **Zonal Head (ZH) Dashboard Enhancements:**
  - **Daily Goal Setting:** Zonal Heads can now set daily goals for each Team Lead, per item, based on aggregated Sales Executive forecasts for the *current day*. The section heading clearly indicates the current date.
- **Logistics Manager (LM) Dashboard Enhancements:**
  - **Cooked Food Collection Workflow:** LMs now collect cooked food with status `Ready for Logistics Collection` (from the Stock Manager), integrating into the new cooked food handling workflow.

 - #### Logistics Manager (LM)                                                              │
 │     66 - - **Cooked Food Collection:** **(UPDATED)** LM now collects cooked food with status      │
 │        `Ready for Logistics Collection` (from Stock Manager).                                     │
 │     67 - - **Distribution:** Distributes food to Team Leads based on daily targets.               │
 │     68 - - **Stock Back Requests:** Views stock back requests from Team Leads, confirms pickup,   │
 │        and marks them "Ready for Restock".  

#### Firestore Schema Updates:
- **`dailyTargets` collection:** Documents now include `forecastId` and `forecastWeek` fields.
- **`cookingAssignments` collection:** New statuses added: `Pending Stock Manager Collection` and `Ready for Logistics Collection`.

- ### 7. Firestore Database Schema                                                         │
 │     71 -                                                                                          │
 │     72 - This section outlines the structure of the shared Firestore database used by the         │
 │        Customer App, Vendor App, and the Supply Chain Management App.                             │
 │     73 -                                                                                          │
 │     74 - #### Core Collections                                                                    │
 │     75 -                                                                                          │
 │     76 - - **`profiles`**: Manages user profiles, roles, permissions, `empCode`, and `reportsTo`  │
 │        .                                                                                          │
 │     77 - - **`recipes`**: Stores food item recipes, including `name`, `mrp`, `sellingPrice`,      │
 │        `description`, `imageUrl`, `ingredients` (with `name`, `quantity`, `unit`, `cost`), and    │
 │        `incentives`.                                                                              │
 │     78 - - **`ingredients`**: Master list of ingredients with `name`, `unit`, `costPerUnit`.      │
 │     79 - - **`non-registered-customers`**: Stores details of non-registered customers.            │
 │     80 - - **`vendors`**: Manages vendor-specific information, including `empCode`.               │
 │     81 - - **`stock`**: Current inventory of each ingredient (`quantity`, `unit`).                │
 │     82 - - **`preparedStock`**: Current inventory of fully cooked/prepared items (`quantity`,     │
 │        `returnedAt`).                                                                             │
 │     83 - - **`spoilageLog`**: Logs spoilage events (`itemId`, `itemName`, `itemType`, `quantity`  │
 │        , `stockManagerId`, `reportedAt`).                                                         │
 │     84 -                                                                                          │
 │     85 - #### Transactional Collections                                                           │
 │     86 -                                                                                          │
 │     87 - - **`forecasts`**: Weekly sales forecasts.                                               │
 │     88 -     - **Fields:** `zonalHeadId`, `teamLeadId`, `forecastWeek` (`dd-mm-yyyy`), `items`    │
 │        (array of `name`, `recipeId`, `dailyQuantities` for Mon-Sun, `quantity`), `status` (       │
 │        `Draft`, `Pending Stock Manager Approval`, `Rejected by Stock Manager`, `Pending Finance   │
 │        Approval`, `Accepted by Finance`, `Rejected by Finance`), `createdAt`.                     │
 │     89 - - **`dailyTargets`**: Daily sales targets set by Zonal Heads.                            │
 │     90 -     - **Fields:** `zonalHeadId`, `teamLeadId`, `date` (`dd-mm-yyyy`), `items` (array of  │
 │        `recipeId`, `quantity`, `name`), `forecastId` (ID of the weekly forecast), `forecastWeek`  │
 │        (start date of the forecast week).                                                         │
 │     91 - - **`procurementRequests`**: Requests for procuring ingredients.                         │
 │     92 - - **`cookingAssignments`**: Daily cooking tasks.                                         │
 │     93 -     - **Fields:** `date` (`dd-mm-yyyy`), `kitchenId`, `kitchenName`, `kitchenManagerId`  │
 │        , `items` (cooked items), `fromPreparedStock` (items from prepared stock), `status` (      │
 │        `Pending Dispersal`, `Dispersed`, `Ingredients Received`, `Pending Stock Manager           │
 │        Collection`, `Ready for Logistics Collection`, `Collected by Logistics`, `Completed`),     │
 │        `completedAt`, `forecastId`, `forecastWeek`.                                               │
      94 - - **`distributions`**: Tracks cooked food distribution to sales teams.                   │
      95 - - **`logisticsInventory`**: Inventory of the logistics team (`quantity`, `unit`).        │
      96 -                           

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