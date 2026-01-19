## ADDED Requirements
### Requirement: Settings UI
The application SHALL provide a configuration interface.
#### Scenario: Open settings
- **WHEN** the user clicks the settings button
- **THEN** a modal appears with a sidebar navigation layout
- **AND** the sidebar contains tabs for "Data Management", "Cloud Sync", and "Templates"
- **AND** the active tab content is displayed in the main panel
- **AND** the visual style matches the project's Dracula theme

### Requirement: Template Management UI
The application SHALL provide an interface to manage templates.
#### Scenario: List templates
- **WHEN** the templates tab is selected
- **THEN** a list of existing templates is displayed as collapsible cards
- **AND** each card shows the template name and field count
- **AND** a "Create New Template" section is available with quick presets

#### Scenario: Edit template fields
- **WHEN** a template card is expanded
- **THEN** a detailed field editor table is displayed
- **AND** users can add, remove, and modify field properties (key, label, type, required)