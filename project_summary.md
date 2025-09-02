
# Project Summary: Supply Chain Management App

## 1. Overview

This project is a comprehensive Supply Chain Management application built with React. It manages the entire workflow from sales forecasting to final product distribution. The application features a robust role-based access control system, ensuring that each user has access only to the functionalities relevant to their role. The application is integrated with a Firebase backend for data storage and authentication.

## 2. User Roles and Responsibilities

The application has a variety of user roles, each with specific responsibilities:

*   **Admin**: Manages user profiles, defines recipes, and assigns cooking tasks to kitchens.
*   **Zonal Head**: Creates and submits sales forecasts for their respective team leads.
*   **Finance & Accounts**: Reviews, modifies, and approves or rejects sales forecasts.
*   **Procurement Manager**: Views procurement requests and marks them as "Purchased".
*   **Stock Manager**: Confirms the receipt of purchased items into stock and disperses ingredients to kitchens.
*   **Kitchen Manager**: Views assigned cooking tasks, confirms receipt of ingredients, and submits the final cooked quantities.
*   **Logistics Manager**: Collects cooked food from kitchens, manages the logistics inventory, and distributes the food to team leads.
*   **Team Lead**: Views incoming deliveries and confirms their receipt.

## 3. The Supply Chain Workflow

The application orchestrates the entire supply chain in a series of sequential steps:

1.  **Recipe Management (Admin)**: The Admin defines the ingredients and quantities required for each food item. This forms the basis for all procurement calculations.
2.  **Forecasting (Zonal Head)**: A Zonal Head submits a sales forecast, detailing the number of food units each Team Lead is projected to sell.
3.  **Approval (Finance & Accounts)**: The forecast is sent to the Finance & Accounts department for review. They can approve the forecast as is, or modify the quantities before giving final approval.
4.  **Procurement (Procurement Manager)**: Upon forecast approval, the system automatically calculates the total raw materials needed based on the recipes and generates a procurement request. The Procurement Manager buys the ingredients and marks the request as "Purchased".
5.  **Stocking (Stock Manager)**: The Stock Manager confirms receipt of the purchased ingredients, adding them to the stock.
6.  **Kitchen Assignment (Admin)**: The Admin assigns the total cooking load to various kitchens based on the approved forecasts.
7.  **Ingredient Dispersal (Stock Manager)**: The Stock Manager dispatches ingredients to the individual kitchens based on the Admin's assignment.
8.  **Cooking (Kitchen Manager)**: The Kitchen Manager confirms receipt of the ingredients and, after cooking, reports the actual quantity of food produced, marking the assignment as "Completed".
9.  **Food Collection (Logistics Manager)**: The Logistics Manager collects the cooked food from all kitchens and confirms the total amount received, adding it to the logistics inventory.
10. **Distribution (Logistics Manager)**: The Logistics Manager distributes the food to the various Team Leads and records the quantities for each.
11. **Delivery Confirmation (Team Lead)**: Each Team Lead confirms receipt of the food, completing the cycle.
12. **Stock Back (Team Lead, Logistics Manager & Stock Manager)**: The Team Lead initiates a "stock back" for unsold items. The Logistics Manager collects these items, and the Stock Manager restocks the raw ingredients into the central inventory.

## 4. Technologies and Project Structure

*   **Frontend**: React, React Router, Tailwind CSS
*   **Backend**: Firebase (Firestore)
*   **Project Structure**: The `src` directory is well-organized by feature and responsibility:
    *   `api`: Intended for API-related logic.
    *   `assets`: Static assets like images and icons.
    *   `components`: Reusable React components.
    *   `constants`: Constant values used throughout the application.
    *   `contexts`: React Context providers for managing global state (e.g., `AuthContext`).
    *   `hooks`: Custom React hooks.
    *   `pages`: The main pages of the application, organized by role.
    *   `routes`: Route definitions.
    *   `services`: Services for interacting with Firebase.
    *   `styles`: Global styles.
    *   `utils`: Utility functions.

This summary provides a comprehensive overview of the project. I am now ready to assist you with any task. Please let me know how you would like to proceed.
