/**
 * Settings Tab
 * Main settings interface for the Semantic AI plugin
 */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type SemanticAIPlugin from './main';
import { SemanticAISettings, DEFAULT_SETTINGS } from './types';
import { PromptManager } from './ai/prompt-manager';
import { AIClassifier } from './ai/classifier';
import {
  createPromptTabs,
  createCustomClassifierSettings,
  createPromptImportExport
} from './ui/prompt-tabs';

export class SemanticAISettingTab extends PluginSettingTab {
  plugin: SemanticAIPlugin;
  promptManager: PromptManager;
  classifier: AIClassifier;

  constructor(app: App, plugin: SemanticAIPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.promptManager = new PromptManager(plugin.settings);
    this.classifier = new AIClassifier(plugin.settings, this.promptManager);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h1', { text: 'Semantic AI Settings' });

    // Create main tabs
    this.createMainTabs(containerEl);
  }

  private createMainTabs(containerEl: HTMLElement): void {
    const tabContainer = containerEl.createEl('div', { cls: 'semantic-ai-main-tabs' });
    const tabNav = tabContainer.createEl('div', { cls: 'semantic-ai-main-tab-nav' });
    const tabContent = tabContainer.createEl('div', { cls: 'semantic-ai-main-tab-content' });

    const tabs = [
      { id: 'ai', name: '🤖 AI Settings', render: this.renderAISettings.bind(this) },
      { id: 'prompts', name: '🧠 Prompt Editor', render: this.renderPromptEditor.bind(this) },
      { id: 'custom', name: '➕ Custom Classifiers', render: this.renderCustomClassifiers.bind(this) },
      { id: 'tags', name: '📜 Tag Settings', render: this.renderTagSettings.bind(this) },
      { id: 'graph', name: '📈 Graph Settings', render: this.renderGraphSettings.bind(this) },
      { id: 'sync', name: '🔗 Backend Sync', render: this.renderSyncSettings.bind(this) }
    ];

    const tabButtons: HTMLElement[] = [];
    const tabPanels: HTMLElement[] = [];

    tabs.forEach((tab, index) => {
      const tabBtn = tabNav.createEl('button', {
        cls: `semantic-ai-main-tab-btn ${index === 0 ? 'active' : ''}`,
        text: tab.name
      });
      tabButtons.push(tabBtn);

      const panel = tabContent.createEl('div', {
        cls: `semantic-ai-main-tab-panel ${index === 0 ? 'active' : ''}`
      });
      tabPanels.push(panel);

      tab.render(panel);

      tabBtn.onclick = () => {
        tabButtons.forEach(btn => btn.removeClass('active'));
        tabPanels.forEach(p => p.removeClass('active'));
        tabBtn.addClass('active');
        panel.addClass('active');
      };
    });
  }

  private renderAISettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'AI Provider Configuration' });

    // Provider selection
    new Setting(containerEl)
      .setName('AI Provider')
      .setDesc('Select your AI provider')
      .addDropdown(dropdown => {
        dropdown
          .addOption('openai', 'OpenAI')
          .addOption('anthropic', 'Anthropic (Claude)')
          .addOption('ollama', 'Ollama (Local)')
          .addOption('custom', 'Custom API')
          .setValue(this.plugin.settings.aiProvider)
          .onChange(async (value) => {
            this.plugin.settings.aiProvider = value as 'openai' | 'anthropic' | 'ollama' | 'custom';
            await this.plugin.saveSettings();

            // Update default endpoint
            if (value === 'openai') {
              this.plugin.settings.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
              this.plugin.settings.modelName = 'gpt-4o-mini';
            } else if (value === 'anthropic') {
              this.plugin.settings.apiEndpoint = 'https://api.anthropic.com/v1/messages';
              this.plugin.settings.modelName = 'claude-3-haiku-20240307';
            } else if (value === 'ollama') {
              this.plugin.settings.apiEndpoint = 'http://localhost:11434/api/generate';
              this.plugin.settings.modelName = 'llama2';
            }

            await this.plugin.saveSettings();
            this.display();
          });
      });

    // API Key
    if (this.plugin.settings.aiProvider !== 'ollama') {
      new Setting(containerEl)
        .setName('API Key')
        .setDesc('Your API key for the selected provider')
        .addText(text => {
          text
            .setPlaceholder('Enter API key...')
            .setValue(this.plugin.settings.apiKey)
            .onChange(async (value) => {
              this.plugin.settings.apiKey = value;
              await this.plugin.saveSettings();
            });

          text.inputEl.type = 'password';
        });
    }

    // API Endpoint
    new Setting(containerEl)
      .setName('API Endpoint')
      .setDesc('API endpoint URL')
      .addText(text => {
        text
          .setPlaceholder('https://api.example.com/v1/chat')
          .setValue(this.plugin.settings.apiEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.apiEndpoint = value;
            await this.plugin.saveSettings();
          });
      });

    // Model Name
    new Setting(containerEl)
      .setName('Model Name')
      .setDesc('The model to use for classification')
      .addText(text => {
        text
          .setPlaceholder('gpt-4o-mini')
          .setValue(this.plugin.settings.modelName)
          .onChange(async (value) => {
            this.plugin.settings.modelName = value;
            await this.plugin.saveSettings();
          });
      });

    // Test Connection
    new Setting(containerEl)
      .setName('Test Connection')
      .setDesc('Test your API configuration')
      .addButton(button => {
        button
          .setButtonText('Test')
          .onClick(async () => {
            button.setButtonText('Testing...');
            button.setDisabled(true);

            const result = await this.classifier.testConnection();

            button.setButtonText('Test');
            button.setDisabled(false);

            new Notice(result.message);
          });
      });

    // Model recommendations
    containerEl.createEl('h4', { text: 'Recommended Models' });

    const recommendations = containerEl.createEl('div', { cls: 'semantic-ai-recommendations' });

    const models = [
      { provider: 'OpenAI', model: 'gpt-4o-mini', desc: 'Fast & affordable', cost: '$0.15/1M tokens' },
      { provider: 'OpenAI', model: 'gpt-4o', desc: 'Most capable', cost: '$2.50/1M tokens' },
      { provider: 'Anthropic', model: 'claude-3-haiku', desc: 'Fast & affordable', cost: '$0.25/1M tokens' },
      { provider: 'Anthropic', model: 'claude-3-sonnet', desc: 'Balanced', cost: '$3.00/1M tokens' },
      { provider: 'Ollama', model: 'llama2', desc: 'Local, free', cost: 'Free' }
    ];

    const table = recommendations.createEl('table');
    const header = table.createEl('tr');
    header.createEl('th', { text: 'Provider' });
    header.createEl('th', { text: 'Model' });
    header.createEl('th', { text: 'Description' });
    header.createEl('th', { text: 'Cost' });

    for (const model of models) {
      const row = table.createEl('tr');
      row.createEl('td', { text: model.provider });
      row.createEl('td', { text: model.model });
      row.createEl('td', { text: model.desc });
      row.createEl('td', { text: model.cost });
    }
  }

  private renderPromptEditor(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Prompt Editor' });
    containerEl.createEl('p', {
      text: 'Customize the prompts used to identify each semantic element type.'
    });

    createPromptTabs(containerEl, this.promptManager, () => this.plugin.saveSettings());

    // Import/Export section
    containerEl.createEl('hr');
    createPromptImportExport(containerEl, this.promptManager, () => this.plugin.saveSettings());
  }

  private renderCustomClassifiers(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Custom Classifiers' });

    createCustomClassifierSettings(containerEl, this.promptManager, () => this.plugin.saveSettings());
  }

  private renderTagSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Tag Settings' });

    new Setting(containerEl)
      .setName('Show Hidden Tags')
      .setDesc('Display semantic tag blocks in notes by default')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showHiddenTags)
          .onChange(async (value) => {
            this.plugin.settings.showHiddenTags = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Auto-generate Mermaid')
      .setDesc('Automatically generate Mermaid diagrams after classification')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.autoGenerateMermaid)
          .onChange(async (value) => {
            this.plugin.settings.autoGenerateMermaid = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Mermaid Position')
      .setDesc('Where to display Mermaid diagrams')
      .addDropdown(dropdown => {
        dropdown
          .addOption('panel', 'Side Panel')
          .addOption('append', 'Append to Note')
          .setValue(this.plugin.settings.mermaidPosition)
          .onChange(async (value) => {
            this.plugin.settings.mermaidPosition = value as 'panel' | 'append';
            await this.plugin.saveSettings();
          });
      });

    // Batch processing settings
    containerEl.createEl('h3', { text: 'Batch Processing' });

    new Setting(containerEl)
      .setName('Confirm Batch Processing')
      .setDesc('Show confirmation dialog before batch processing')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.confirmBatchProcessing)
          .onChange(async (value) => {
            this.plugin.settings.confirmBatchProcessing = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Show Token Estimate')
      .setDesc('Display estimated token usage and cost before processing')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showTokenEstimate)
          .onChange(async (value) => {
            this.plugin.settings.showTokenEstimate = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderGraphSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Graph Settings' });

    new Setting(containerEl)
      .setName('Graph Direction')
      .setDesc('Direction of the Mermaid flowchart')
      .addDropdown(dropdown => {
        dropdown
          .addOption('TD', 'Top to Bottom')
          .addOption('LR', 'Left to Right')
          .addOption('BT', 'Bottom to Top')
          .addOption('RL', 'Right to Left')
          .setValue(this.plugin.settings.graphDirection)
          .onChange(async (value) => {
            this.plugin.settings.graphDirection = value as 'TD' | 'LR' | 'BT' | 'RL';
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Graph Theme')
      .setDesc('Visual theme for Mermaid diagrams')
      .addDropdown(dropdown => {
        dropdown
          .addOption('default', 'Default')
          .addOption('forest', 'Forest')
          .addOption('dark', 'Dark')
          .addOption('neutral', 'Neutral')
          .setValue(this.plugin.settings.graphTheme)
          .onChange(async (value) => {
            this.plugin.settings.graphTheme = value as 'default' | 'forest' | 'dark' | 'neutral';
            await this.plugin.saveSettings();
          });
      });

    // Preview
    containerEl.createEl('h4', { text: 'Preview' });

    const preview = containerEl.createEl('pre', { cls: 'mermaid semantic-ai-preview' });
    preview.textContent = `graph ${this.plugin.settings.graphDirection}
  ax1(["Axiom: Sample"])
  cl1["Claim: Example"]
  ev1[("Evidence: Data")]
  ax1 --> cl1 --> ev1`;
  }

  private renderSyncSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Backend Sync' });

    new Setting(containerEl)
      .setName('Enable Postgres Sync')
      .setDesc('Sync tags with a PostgreSQL database')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.enablePostgresSync)
          .onChange(async (value) => {
            this.plugin.settings.enablePostgresSync = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (this.plugin.settings.enablePostgresSync) {
      // Python Service URL
      new Setting(containerEl)
        .setName('Python Service URL')
        .setDesc('URL of the Python sync service (handles DB operations)')
        .addText(text => {
          text
            .setPlaceholder('http://localhost:5000')
            .setValue(this.plugin.settings.pythonServiceUrl)
            .onChange(async (value) => {
              this.plugin.settings.pythonServiceUrl = value;
              await this.plugin.saveSettings();
            });
        });

      // Connection Profiles Section
      containerEl.createEl('h3', { text: '🗄️ Database Connections' });
      containerEl.createEl('p', {
        cls: 'setting-item-description',
        text: 'Configure multiple PostgreSQL connections (dev, staging, production, etc.)'
      });

      // Ensure postgresConnections exists
      if (!this.plugin.settings.postgresConnections) {
        this.plugin.settings.postgresConnections = [];
      }

      // List existing connections
      const connectionsContainer = containerEl.createEl('div', { cls: 'semantic-ai-connections-list' });

      this.plugin.settings.postgresConnections.forEach((conn, index) => {
        const connEl = connectionsContainer.createEl('div', { cls: 'semantic-ai-connection-item' });
        
        // Connection header with radio button for active selection
        const headerEl = connEl.createEl('div', { cls: 'semantic-ai-connection-header' });
        
        const isActive = this.plugin.settings.activeConnectionId === conn.id;
        
        // Radio button for active connection
        const radioLabel = headerEl.createEl('label', { cls: 'semantic-ai-connection-radio' });
        const radio = radioLabel.createEl('input', { type: 'radio' });
        radio.name = 'activeConnection';
        radio.checked = isActive;
        radio.onchange = async () => {
          this.plugin.settings.activeConnectionId = conn.id;
          await this.plugin.saveSettings();
          this.display();
        };
        radioLabel.appendText(` ${conn.name}`);
        if (isActive) {
          radioLabel.createEl('span', { text: ' ✓ ACTIVE', cls: 'semantic-ai-active-badge' });
        }

        // Status indicator
        const statusEl = headerEl.createEl('span', { cls: `semantic-ai-connection-status status-${conn.lastTestStatus}` });
        if (conn.lastTestStatus === 'success') {
          statusEl.textContent = '🟢 Connected';
        } else if (conn.lastTestStatus === 'failed') {
          statusEl.textContent = '🔴 Failed';
        } else {
          statusEl.textContent = '⚪ Not tested';
        }

        // Connection name input
        new Setting(connEl)
          .setName('Connection Name')
          .addText(text => {
            text
              .setPlaceholder('e.g., Production, Local Dev')
              .setValue(conn.name)
              .onChange(async (value) => {
                this.plugin.settings.postgresConnections[index].name = value;
                await this.plugin.saveSettings();
              });
          });

        // Connection string input
        new Setting(connEl)
          .setName('Connection String')
          .setDesc('postgresql://user:password@host:port/database')
          .addText(text => {
            text
              .setPlaceholder('postgresql://postgres:pass@localhost:5432/theophysics')
              .setValue(conn.connectionString)
              .onChange(async (value) => {
                this.plugin.settings.postgresConnections[index].connectionString = value;
                await this.plugin.saveSettings();
              });
            text.inputEl.style.width = '100%';
            text.inputEl.style.fontFamily = 'monospace';
          });

        // Test & Delete buttons
        new Setting(connEl)
          .addButton(button => {
            button
              .setButtonText('🧪 Test Connection')
              .onClick(async () => {
                button.setButtonText('Testing...');
                button.setDisabled(true);
                
                const result = await this.testPostgresConnection(conn.connectionString);
                
                this.plugin.settings.postgresConnections[index].lastTested = new Date().toISOString();
                this.plugin.settings.postgresConnections[index].lastTestStatus = result.success ? 'success' : 'failed';
                this.plugin.settings.postgresConnections[index].lastTestMessage = result.message;
                await this.plugin.saveSettings();
                
                new Notice(result.message);
                this.display();
              });
          })
          .addButton(button => {
            button
              .setButtonText('🗑️ Delete')
              .setWarning()
              .onClick(async () => {
                if (this.plugin.settings.postgresConnections.length <= 1) {
                  new Notice('Cannot delete the last connection. Add another first.');
                  return;
                }
                this.plugin.settings.postgresConnections.splice(index, 1);
                if (this.plugin.settings.activeConnectionId === conn.id) {
                  this.plugin.settings.activeConnectionId = this.plugin.settings.postgresConnections[0]?.id || null;
                }
                await this.plugin.saveSettings();
                this.display();
              });
          });

        // Show last test result
        if (conn.lastTested) {
          const lastTestEl = connEl.createEl('div', { cls: 'semantic-ai-last-test' });
          lastTestEl.textContent = `Last tested: ${new Date(conn.lastTested).toLocaleString()}`;
          if (conn.lastTestMessage) {
            lastTestEl.createEl('div', { text: conn.lastTestMessage, cls: 'semantic-ai-test-message' });
          }
        }

        connEl.createEl('hr');
      });

      // Add new connection button
      new Setting(containerEl)
        .setName('Add New Connection')
        .setDesc('Add another database connection profile')
        .addButton(button => {
          button
            .setButtonText('➕ Add Connection')
            .setCta()
            .onClick(async () => {
              const newId = 'conn_' + Date.now();
              this.plugin.settings.postgresConnections.push({
                id: newId,
                name: 'New Connection',
                connectionString: 'postgresql://user:password@localhost:5432/database',
                lastTested: null,
                lastTestStatus: 'never',
                lastTestMessage: null
              });
              await this.plugin.saveSettings();
              this.display();
            });
        });

      // Quick connect presets
      containerEl.createEl('h4', { text: 'Quick Presets' });
      
      new Setting(containerEl)
        .setName('Common Configurations')
        .addButton(btn => btn.setButtonText('Local Dev').onClick(async () => {
          const newId = 'local_' + Date.now();
          this.plugin.settings.postgresConnections.push({
            id: newId, name: 'Local Development',
            connectionString: 'postgresql://postgres:password@localhost:5432/theophysics',
            lastTested: null, lastTestStatus: 'never', lastTestMessage: null
          });
          await this.plugin.saveSettings();
          this.display();
        }))
        .addButton(btn => btn.setButtonText('Supabase').onClick(async () => {
          const newId = 'supabase_' + Date.now();
          this.plugin.settings.postgresConnections.push({
            id: newId, name: 'Supabase',
            connectionString: 'postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres',
            lastTested: null, lastTestStatus: 'never', lastTestMessage: null
          });
          await this.plugin.saveSettings();
          this.display();
        }))
        .addButton(btn => btn.setButtonText('Neon').onClick(async () => {
          const newId = 'neon_' + Date.now();
          this.plugin.settings.postgresConnections.push({
            id: newId, name: 'Neon',
            connectionString: 'postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require',
            lastTested: null, lastTestStatus: 'never', lastTestMessage: null
          });
          await this.plugin.saveSettings();
          this.display();
        }));
    }

    // Documentation
    containerEl.createEl('h4', { text: 'Setup Guide' });
    const guideEl = containerEl.createEl('div', { cls: 'semantic-ai-sync-guide' });
    guideEl.createEl('p', { text: 'To enable backend sync:' });
    const steps = guideEl.createEl('ol');
    steps.createEl('li', { text: 'Set up a PostgreSQL database (local, Supabase, Neon, etc.)' });
    steps.createEl('li', { text: 'Add your connection string above' });
    steps.createEl('li', { text: 'Test the connection' });
    steps.createEl('li', { text: 'Select the active connection' });
    steps.createEl('li', { text: 'Start the Python sync service if needed' });
    guideEl.createEl('p', { text: 'All tags include UUIDs which serve as global identifiers for syncing.' });
  }

  private async testPostgresConnection(connectionString: string): Promise<{success: boolean, message: string}> {
    try {
      const serviceUrl = this.plugin.settings.pythonServiceUrl;
      
      const response = await fetch(`${serviceUrl}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, message: `HTTP ${response.status}: ${error}` };
      }

      const result = await response.json();
      return { 
        success: result.success, 
        message: result.success ? '✅ Connection successful!' : `❌ ${result.error}` 
      };
    } catch (error) {
      // If Python service isn't running, try direct connection info
      return { 
        success: false, 
        message: `⚠️ Python service not reachable at ${this.plugin.settings.pythonServiceUrl}. Start the service or check URL.` 
      };
    }
  }
}
