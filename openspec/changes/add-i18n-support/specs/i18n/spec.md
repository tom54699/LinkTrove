# Capability: i18n (Internationalization)

## ADDED Requirements

### Requirement: Language Selection

The system SHALL provide a language selection option in the Settings modal, allowing users to switch between supported languages.

#### Scenario: User selects a different language
- **WHEN** user opens Settings modal and selects a language from the dropdown
- **THEN** the UI language switches immediately without page reload
- **AND** the selected language is persisted to chrome.storage.local

#### Scenario: Language preference persists across sessions
- **WHEN** user reopens the extension after selecting a language
- **THEN** the UI displays in the previously selected language

### Requirement: Supported Languages

The system SHALL support the following languages in the first phase:
- English (en) - default
- Traditional Chinese (zh-TW)

#### Scenario: Default language for new installations
- **WHEN** a user installs the extension for the first time
- **THEN** the UI displays in English as the default language

#### Scenario: All supported languages available in selector
- **WHEN** user opens the language selector in Settings
- **THEN** both English and Traditional Chinese options are displayed

### Requirement: UI Text Translation

The system SHALL display all fixed UI text (buttons, labels, menus, dialogs, toasts, placeholders) in the selected language.

#### Scenario: Fixed UI elements display in selected language
- **WHEN** user has selected Traditional Chinese
- **THEN** all buttons, menu items, dialog texts, and toast messages display in Traditional Chinese

#### Scenario: User-generated content remains unchanged
- **WHEN** user switches language
- **THEN** card titles, URLs, organization names, category names, and custom field values remain unchanged

### Requirement: Translation File Structure

The system SHALL use Chrome's native i18n mechanism with `_locales/` directory structure.

#### Scenario: Translation files are properly structured
- **WHEN** the extension is built
- **THEN** `_locales/en/messages.json` and `_locales/zh_TW/messages.json` exist with all required keys

#### Scenario: Missing translation key fallback
- **WHEN** a translation key is not found in the current language file
- **THEN** the system displays the key name as fallback (not blank)

### Requirement: Dynamic Text with Placeholders

The system SHALL support dynamic text with variable substitution for messages containing counts or other dynamic values.

#### Scenario: Toast message with count
- **WHEN** user moves 3 cards and language is English
- **THEN** toast displays "Moved 3 cards"

#### Scenario: Toast message with count in Chinese
- **WHEN** user moves 3 cards and language is Traditional Chinese
- **THEN** toast displays "已移動 3 張卡片"
