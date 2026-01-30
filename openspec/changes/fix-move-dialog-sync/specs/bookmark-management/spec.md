# Spec: MoveSelectedDialog Data Sync

## Requirement
**Data Freshness**: When the `MoveSelectedDialog` opens, it must display the most current list of available groups (subcategories) for the selected collection.

## Scenario
1.  **GIVEN** the `MoveSelectedDialog` has been opened previously (loading groups for Collection A).
2.  **AND** the dialog is currently closed.
3.  **WHEN** the user creates a new Group in Collection A via the Sidebar.
4.  **AND** the user opens the `MoveSelectedDialog` again (Collection A is still selected).
5.  **THEN** the "Group" dropdown MUST include the newly created Group.

## Technical Constraint
-   The data fetch must be triggered by the `isOpen` state change.
