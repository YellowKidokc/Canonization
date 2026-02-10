# Theophysics Semantic AI — Obsidian Plugin Development Guide

> This file is the compressed specification for any AI programmer working on this plugin.
> It contains: (1) the Obsidian Plugin Skill kernel (all 27 rules, submission requirements,
> accessibility mandates, API preferences, CSS patterns), and (2) the CKG dual-axis
> classification system that defines this plugin's core functionality.

---

## Part 1: Obsidian Plugin Development Rules (Kernel Protocol)

```
t:k|v:1.0|s:OBS-PLUGIN-SKILL|r:~20:1|L:~160|a:gapmiss|d:"expand§→full_rules;R27=bot_enforced+mandatory;
  API_prefs=load_bearing;a11y=MANDATORY_not_optional;css_vars=use_always;examples=expand_on_demand"
  ---

  §0|Principles{memory_safety:prevent_leaks_via_proper_resource_mgmt;type_safety:instanceof>casting,¬any;
  API_best_practices:follow_Obsidian_patterns;UX:sentence_case+consistency;platform_compat:cross_platform+iOS;
  a11y:MANDATORY(keyboard+screen_reader+touch);security:¬innerHTML,¬XSS}

  §1|Submission_Bot_Rules{ENFORCED_BY_VALIDATION_BOT;will_auto_reject_if_violated;
  ID:¬contains("obsidian"),¬ends("plugin"),lowercase_only([a-z0-9_-]);
  NAME:¬contains("Obsidian"),¬ends("Plugin"),¬starts("Obsi"),¬ends("dian");
  DESC:¬contains("Obsidian"),¬phrase("This plugin"|"This is a plugin"|"This plugin allows"),
    must_end([.?!)]),max_250chars_recommended;
  MANIFEST:id+name+desc_must_match_manifest.json_in_repo;
  AUTHOR:must_be_repo_owner∨public_org_member;repo_must_have_issues_enabled;
  LICENSE:required(MIT_recommended);
  RELEASE:tag_matches_manifest_version;includes(manifest.json+main.js+styles.css)}

  §2|Memory+Lifecycle{R6:registerEvent()_for_auto_cleanup→¬manual_unsubscribe;
  R7:¬store_view_refs_in_plugin(→memory_leak);return_views_directly_from_registerView;
  ¬pass_plugin_as_Component_to_MarkdownRenderer(lifecycle_too_long→leak);
  ¬detachLeavesOfType_in_onunload(Obsidian_handles_automatically);
  access_views_via:getLeavesOfType()∨getActiveLeavesOfType()_when_needed;
  auto_cleanup_methods:registerEvent(),addCommand(),registerDomEvent(),registerInterval()}

  §3|TypeSafety{R8:instanceof>type_casting;¬(abstractFile_as_TFile);
  use:if(abstractFile_instanceof_TFile){/*safe*/};
  ¬any_type→use_specific_types∨unknown;
  ¬var→const(¬reassigned)+let(reassigned)}

  §4|UI_UX{R9:sentence_case_ALL_UI_text("Advanced settings"¬"Advanced Settings");
  applies_to:setName,setDesc,setText,setTitle,setButtonText,setPlaceholder,setTooltip,
    createEl_text,new_Notice,addCommand_names,aria-label,title,placeholder,textContent;
  R10:¬"command"_in_command_names∨IDs(redundant);
  R11:¬plugin_ID_in_command_IDs(Obsidian_auto_namespaces);
  R12:¬default_hotkeys(avoid_conflicts→let_users_set);
  R13:use_.setHeading()_for_settings_headings(¬createEl('h3'));
  ¬"General"∨"settings"∨"options"∨plugin_name_in_settings_headings;
  callbacks:callback(always)|checkCallback(conditional→true/false)|editorCallback(editor_required)}

  §5|API_Preferences{R14:Editor_API>Vault.modify_for_active_file(preserves_cursor);
  editor.replaceRange()∨editor.setValue()∨editor.replaceSelection();
  R15:Vault.process()>read+modify_for_background(atomic,prevents_conflicts);
  FileManager.processFrontMatter()_for_YAML(atomic);
  R16:normalizePath()_for_user_paths(cross_platform);
  R17:Platform_API>navigator(Platform.isMacOS,isWin,isLinux,isMobile,isIosApp,isAndroidApp,isDesktopApp);
  R18:requestUrl()>fetch()(bypasses_CORS);import{requestUrl}_from_'obsidian';
  R19:¬console.log_in_onload/onunload_in_production;errors_only∨debug_flag;
  this.app>global_app;
  Vault_API>Adapter_API(safety+serialization);
  fileManager.trashFile()>vault.trash()(handles_backlinks);
  direct_lookup(getAbstractFileByPath)>vault_iteration(getMarkdownFiles().find);
  vault.configDir>hardcoded_".obsidian";
  AbstractInputSuggest>custom_TextInputSuggest(¬createPopper);
  window.setTimeout:number>NodeJS.Timeout;
  async/await>Promise_chains;
  Obsidian_helpers(createDiv,createSpan,createEl,createFragment)>document.createElement;
  Object.assign({},DEFAULT,data)→must_have_3_params}

  §6|CSS_Styling{R20:use_Obsidian_CSS_vars→¬hardcode_colors/sizes/spacing;
  R21:scope_CSS_to_plugin_containers→¬broad_selectors;
  ¬inline_styles(element.style.X);→addClass+styles.css;
  ¬create_link∨style_elements(Obsidian_auto_loads_styles.css);
  COLORS:--text-normal,--text-muted,--text-faint,--text-accent,--text-error,--text-success,--text-warning,
    --background-primary,--background-secondary,--interactive-normal,--interactive-hover,--interactive-accent,
    --background-modifier-border;
  SPACING(4px_grid):--size-4-1(4px),--size-4-2(8px),--size-4-3(12px),--size-4-4(16px),--size-4-6(24px),
    --size-4-8(32px);
  TYPOGRAPHY:--font-text-theme,--font-interface-theme,--font-monospace-theme,
    --font-ui-small(13px),--font-ui-medium(15px),--font-ui-large(20px);
  BORDERS:--radius-s,--radius-m,--radius-l,--input-radius,--border-width,
    --background-modifier-border-focus,--background-modifier-border-hover;
  MODAL:--modal-background,--modal-border-color,--modal-max-width,--modal-max-height;
  theme_support:CSS_vars_auto_adapt→¬manual_.theme-dark/.theme-light;
  scope_patterns:.view-type-{id},.modal.{plugin}-modal,.{plugin}-settings-tab}

  §7|Accessibility_MANDATORY{R22:ALL_interactive_elements→keyboard_accessible;
  tabindex="0"+role="button"+aria-label;keydown:Enter∨Space→e.preventDefault()+action;
  arrow_keys_for_lists/menus;
  R23:ARIA_labels_on_ALL_icon_buttons(¬icon_without_label);
  common_attrs:aria-label,aria-description,role,aria-expanded,aria-selected,aria-disabled;
  R24:focus_indicators_via_:focus-visible(¬:focus);
  css:outline:2px_solid_var(--interactive-accent)+outline-offset:2px;
  ∨box-shadow:0_0_0_3px_var(--background-modifier-border-focus);
  tooltips:data-tooltip-position(top|bottom|left|right)+setTooltip()+always_pair_w/aria-label;
  focus_mgmt:focus_first_interactive_on_modal_open;trap_focus_in_modals;return_focus_on_close;
  screen_reader:aria-live="polite"+aria-atomic="true"_for_dynamic_content;semantic_HTML_roles;
  touch:min_44x44px(iOS)∨48x48px(Android);adequate_spacing;test_actual_devices}

  §8|Security+Compat{R25:¬innerHTML∨outerHTML(XSS_risk)→DOM_API(createDiv,setText,textContent);
  R26:¬regex_lookbehind(iOS<16.4_incompatible);use_capture_group_instead;
  R27:remove_ALL_sample/template_code(MyPlugin,SampleModal,SampleSettingTab,MyPluginSettings)}

  §9|Project_Structure{
  dir_layout:src/(main.ts,settings.ts,commands/,modals/,utils/)+manifest.json+styles.css+
    tsconfig.json+package.json+esbuild.config.mjs+version-bump.mjs+versions.json+.gitignore+LICENSE;
  manifest.json:{id,name,version,minAppVersion,description,author,authorUrl,isDesktopOnly};
  esbuild:entryPoints["src/main.ts"],bundle:true,external:[obsidian,electron,@codemirror/*,@lezer/*,builtins],
    format:cjs,target:es2018;
  semver:MAJOR(breaking)|MINOR(feature)|PATCH(fix);
  submission:fork_obsidianmd/obsidian-releases→add_to_community-plugins.json→PR;
  release:tag=manifest.version;attach(manifest.json+main.js+styles.css)}
```

**Symbol key:** `¬` = do not, `→` = use/implies, `>` = preferred over, `∨` = or, `∧` = and

---

## Part 2: CKG Dual-Axis Classification System

This plugin implements a **Canonical Knowledge Graph (CKG)** with dual-axis classification:

### Axis 1 — "What is this?" (Epistemic Type)

The `TagType` union in `src/types.ts` defines all classification categories:

| Type | Description |
|------|-------------|
| Axiom | Self-evident foundational truths (framework axioms A1-A188) |
| Claim | Assertions requiring evidence/argument |
| Hypothesis | Testable predictions derived from framework |
| Definition | Formal term definitions establishing meaning |
| Theory | Comprehensive explanatory frameworks |
| Observation | Empirical data points or experimental findings |
| Law | Established regularities (mathematical relationships) |
| Theorem | Formally proven propositions |
| Lemma | Supporting propositions used in proofs |
| Canonical | Authoritative framework elements (axiom-derived) |
| EvidenceBundle | Collections of supporting evidence |
| ScientificProcess | Methodological steps and procedures |
| Relationship | Connections between concepts |
| InternalLink | Links within the vault |
| ExternalLink | Links to external resources |
| ProperName | Named entities (people, places, institutions) |
| ForwardLink | Placeholder links to future content |
| WordOntology | Vocabulary and terminology mappings |
| Sentence | Sentence-level semantic units |
| Paragraph | Paragraph-level semantic units |
| Custom | User-defined classifier output |

The **CKG_TYPES** constant exports the 11 core epistemic types used as defaults:
`Axiom, Claim, Hypothesis, Definition, Theory, Observation, Law, Theorem, Lemma, Canonical, EvidenceBundle`

### Axis 2 — "Where does this resonate?" (Domain Mapping)

The `Domain` type defines 10 knowledge domains:

| Domain | Scope |
|--------|-------|
| Physics | Physical laws, forces, fields, particles, spacetime, quantum mechanics |
| Theology | Divine nature, revelation, scripture, soteriology, ecclesiology |
| Mathematics | Formal systems, proofs, number theory, algebra, topology |
| InformationTheory | Entropy, information content, coding theory, signal processing |
| Consciousness | Qualia, awareness, observer effects, phenomenology |
| Morality | Ethics, moral law, good/evil, justice, virtue |
| Cosmology | Universe origins, cosmic evolution, dark energy, large-scale structure |
| Biology | Life processes, evolution, genetics, cellular mechanisms |
| Philosophy | Epistemology, ontology, logic, metaphysics |
| History | Historical events, periods, historiography |

Every element gets classified on **both axes simultaneously**. Domain mapping is toggled via `settings.enableDomainMapping`.

### Key Files

| File | Purpose |
|------|---------|
| `src/types.ts` | All type definitions, defaults, domain constants |
| `src/main.ts` | Plugin class, 20+ commands, context menus, ribbon |
| `src/settings.ts` | Settings tab UI |
| `src/ai/classifier.ts` | AI classification engine (OpenAI, Anthropic, Ollama, Custom) |
| `src/ai/prompt-manager.ts` | Prompt construction for all tag types + domains |
| `src/tagging/tag-writer.ts` | YAML frontmatter tag persistence |
| `src/tagging/tag-store.ts` | In-memory tag index |
| `src/graph/` | D3.js force-directed graph visualization |
| `styles.css` | All plugin CSS (use Obsidian CSS variables) |
| `manifest.json` | Plugin metadata |

### Framework Context

This plugin serves **David Lowe's Theophysics** — a 188-axiom framework unifying physics, consciousness, and theology via the Logos Field (chi). The Master Equation:

```
chi = triple_integral(G * M * E * S * T * K * R * Q * F * C) dx dy dt
```

The CKG treats consciousness as fundamental (not emergent), and physics + theology as dual projections of a single substrate.

---

## Review Checklist

Before any commit:
- [ ] Memory: uses `registerEvent()`, no stored view refs
- [ ] Types: `instanceof` checks, no `any`, no `var`
- [ ] UI: sentence case all text, no redundant command names
- [ ] APIs: `Editor` API for active file, `Vault.process()` for background, `requestUrl()` for HTTP
- [ ] Accessibility: keyboard nav, ARIA labels, `:focus-visible`, 44px touch targets
- [ ] CSS: Obsidian variables only, scoped selectors, no inline styles
- [ ] Security: no `innerHTML`, no regex lookbehind
- [ ] `CKG_TYPES` used as default (not hardcoded arrays)
- [ ] Domain mapping respects `enableDomainMapping` toggle
- [ ] Light + dark themes tested
- [ ] Mobile tested
