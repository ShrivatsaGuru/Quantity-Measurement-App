# Quantity Measurement Web Application

A **Vanilla JavaScript** web application that allows users to **convert, compare, and perform arithmetic operations** on different measurement quantities such as **Length, Weight, Temperature, and Volume**.

The project follows a **use‑case–driven architecture**, separating **UI logic, calculation logic, and API communication**, and uses **JSON Server** as a mock backend

---

## UC1 – Create JSON Server Database

+ Defines the database schema (`units`, `conversions`, `history`)
+ Seeds unit and conversion data
+ Enables REST endpoints using JSON Server

---

## UC2 – App Initialization

+ Runs after DOM is fully loaded
+ Initializes global application state
+ Sets default measurement type and action
+ Loads initial units and history
+ Attaches all event listeners

---

## UC3 – Fetch Units by Type

+ Fetches units from backend using query parameters
+ Retrieves units for selected measurement type only
+ Used whenever the measurement type changes

---

## UC4 – Fetch Conversion Record

+ Retrieves conversion data for a unit pair
+ Supports factor‑based and formula‑based conversions
+ Handles missing or unsupported conversions gracefully

---

## UC5 – Save Calculation to History

+ Saves successful calculations to backend
+ Stores type, action, expression, result, and timestamp
+ Does not block UI if saving fails

---

## UC6 – Load History

+ Fetches calculation history from backend
+ Sorts history by latest timestamp
+ Triggers UI rendering via UC14

---

## UC7 – Apply Conversion

+ Applies numeric conversion using:
  + Multiplication factor OR
  + Formula string (for temperature)
+ Rounds result to 6 decimal places
+ Validates numeric input

---

## UC8 – Compare Two Values

+ Compares two measurements normalized to the same unit
+ Returns a human‑readable comparison message
+ Handles equal, greater, and lesser cases

---

## UC9 – Perform Arithmetic Operation

+ Executes +, −, ×, ÷ on two normalized values
+ Prevents division by zero
+ Returns rounded numeric result

---

## UC10 – Populate Unit Dropdown

+ Clears and repopulates unit `<select>` elements
+ Adds a default disabled option
+ Ensures clean UI updates

---

## UC11 – Set Active Button

+ Manages `.active` CSS class for buttons
+ Ensures only one button is active per group
+ Used for types, actions, and operators

---

## UC12 – Show Result

+ Displays calculation results in the result panel
+ Supports numeric and text results
+ Adds visual highlight animation

---

## UC13 – Toggle Operator Row

+ Shows operator buttons only in Arithmetic mode
+ Hides operators for Conversion and Comparison
+ Keeps UI clean and intuitive

---

## UC14 – Render History List

+ Renders history records in UI
+ Displays empty state when no history exists
+ Formats timestamps for readability

---

## UC15 – Handle Type Card Click

+ Updates selected measurement type
+ Reloads relevant units
+ Clears inputs and results
+ Resets internal state

---

## UC16 – Handle Action Tab Click

+ Updates selected action (Conversion / Comparison / Arithmetic)
+ Toggles operator visibility
+ Clears previous results

---

## UC17 – Execute Calculation

+ Orchestrates the full calculation flow
+ Validates inputs
+ Executes correct logic based on action
+ Displays result
+ Saves history and refreshes history panel
