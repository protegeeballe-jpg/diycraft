/* DIYCraft compact touch HUD.
   This layer only reorganizes existing controls; the world, storage schema,
   raycasting, inventory and material designers remain owned by the live engine. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const requiredIds = [
    'top-controls', 'settings-toggle', 'sleep-toggle', 'view-toggle',
    'sleep-menu', 'view-menu', 'hud-dismiss', 'build-toolbar',
    'quick-picker', 'quick-picker-title', 'quick-picker-content',
    'quick-picker-close', 'settings-panel', 'animal-species', 'animal-place',
    'block-type', 'activity-mode', 'activity-apply'
  ];
  if (requiredIds.some((id) => !$(id))) {
    console.error('DIYCraft compact HUD could not initialize: a required control is missing.');
    return;
  }

  const sleepMenu = $('sleep-menu');
  const viewMenu = $('view-menu');
  const dismissLayer = $('hud-dismiss');
  const quickPicker = $('quick-picker');
  const quickPickerTitle = $('quick-picker-title');
  const quickPickerContent = $('quick-picker-content');
  const sleepToggle = $('sleep-toggle');
  const viewToggle = $('view-toggle');
  const settingsToggle = $('settings-toggle');
  const settingsPanel = $('settings-panel');
  const buildToolbar = $('build-toolbar');
  const quickColors = window.DIYCraftQuickMaterialColors =
    window.DIYCraftQuickMaterialColors || Object.create(null);

  const defaultColors = Object.freeze({
    grass: '#70b85a',
    tall_grass: '#4ea859',
    leaves: '#4e9a59',
    flower: '#e9a4c1'
  });

  const choiceGroups = new Map();

  function syncChoiceGroup(select, group) {
    if (!select || !group) return;
    group.querySelectorAll('button[data-value]').forEach((button) => {
      const active = button.dataset.value === select.value;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('active', active);
    });
  }

  function syncAllChoiceGroups() {
    choiceGroups.forEach((group, select) => syncChoiceGroup(select, group));
  }

  window.DIYCraftSyncHudChoices = syncAllChoiceGroups;

  function mountChoiceGroup(selectId, title) {
    const select = $(selectId);
    if (!select || choiceGroups.has(select)) return null;
    const sourceLabel = select.closest('label');
    if (!sourceLabel || !sourceLabel.parentElement) return null;

    const group = document.createElement('div');
    group.className = 'hud-choice-group';
    group.id = 'hud-choices-' + selectId;

    const heading = document.createElement('span');
    heading.className = 'hud-choice-title';
    heading.textContent = title;

    const grid = document.createElement('div');
    grid.className = 'hud-choice-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', title);

    Array.from(select.options).forEach((option) => {
      if (option.disabled) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hud-choice-button';
      button.dataset.value = option.value;
      button.dataset.choiceFor = selectId;
      button.textContent = option.textContent.trim();
      button.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncChoiceGroup(select, group);
      });
      grid.append(button);
    });

    group.append(heading, grid);
    sourceLabel.hidden = true;
    sourceLabel.after(group);
    select.classList.add('hud-native-choice');
    choiceGroups.set(select, group);
    select.addEventListener('change', () => syncChoiceGroup(select, group));
    syncChoiceGroup(select, group);
    return group;
  }

  // Visible option grids replace the native dropdowns. The original selects
  // stay in the DOM as the single source of truth for the existing game code.
  mountChoiceGroup('block-type', 'Build material');
  mountChoiceGroup('pattern', 'Tile pattern');
  mountChoiceGroup('door-style', 'Door style');
  mountChoiceGroup('time-mode', 'World lighting');
  mountChoiceGroup('animal-species', 'Choose an animal');
  mountChoiceGroup('activity-mode', 'Character activity');
  mountChoiceGroup('solid-design-type', 'Material type');
  mountChoiceGroup('solid-design-texture', 'Surface texture');
  mountChoiceGroup('tile-design-pattern', 'Tile pattern');
  mountChoiceGroup('door-design-style', 'Door style');

  function closeMenus() {
    sleepMenu.hidden = true;
    viewMenu.hidden = true;
    quickPicker.hidden = true;
    sleepToggle.setAttribute('aria-expanded', 'false');
    viewToggle.setAttribute('aria-expanded', 'false');
    dismissLayer.hidden = true;
    document.body.classList.remove('hud-menu-open');
  }

  function prepareMenu() {
    closeMenus();
    if (!settingsPanel.hidden) settingsToggle.click();
    dismissLayer.hidden = false;
    document.body.classList.add('hud-menu-open');
  }

  function toggleMenu(panel, trigger) {
    const shouldOpen = panel.hidden;
    closeMenus();
    if (!shouldOpen) return;
    if (!settingsPanel.hidden) settingsToggle.click();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    dismissLayer.hidden = false;
    document.body.classList.add('hud-menu-open');
  }

  function makeButton(label, onClick, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className || 'hud-picker-button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function openQuickPicker(title, buildContent) {
    prepareMenu();
    quickPickerTitle.textContent = title;
    quickPickerContent.replaceChildren();
    buildContent(quickPickerContent);
    quickPicker.hidden = false;
    syncAllChoiceGroups();
  }

  function setSelectValue(id, value, dispatchChange) {
    const select = $(id);
    if (!select) return false;
    const exists = Array.from(select.options).some((option) => option.value === value);
    if (!exists) return false;
    select.value = value;
    if (dispatchChange) select.dispatchEvent(new Event('change', { bubbles: true }));
    syncAllChoiceGroups();
    return true;
  }

  function setMaterial(type) {
    if (!setSelectValue('block-type', type, true)) {
      const status = $('status');
      if (status) status.textContent = 'That material is not available in this world version.';
      return false;
    }
    const status = $('status');
    if (status) status.textContent = type.replace(/_/g, ' ') + ' selected. Tap a place in the world to build.';
    return true;
  }

  function makeColorPicker(parent, value, onColor) {
    const label = document.createElement('label');
    label.className = 'hud-color-choice';
    const caption = document.createElement('span');
    caption.textContent = 'Color';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value;
    input.setAttribute('aria-label', 'Choose a full-spectrum material color');
    input.addEventListener('input', () => onColor(input.value));
    input.addEventListener('change', () => onColor(input.value));
    label.append(caption, input);
    parent.append(label);
    return input;
  }

  function openGreenPicker() {
    let activeType = ['grass', 'tall_grass', 'leaves'].includes($('block-type').value)
      ? $('block-type').value : 'grass';
    let colorTouched = false;

    openQuickPicker('Green materials', (root) => {
      const grid = document.createElement('div');
      grid.className = 'hud-picker-grid';
      const entries = [
        ['grass', 'Grass'],
        ['tall_grass', 'Tall grass'],
        ['leaves', 'Leaves']
      ];
      const optionButtons = new Map();

      function syncOptions() {
        optionButtons.forEach((button, type) => {
          button.setAttribute('aria-pressed', String(type === activeType));
          button.classList.toggle('active', type === activeType);
        });
      }

      entries.forEach(([type, label]) => {
        const button = makeButton(label, () => {
          activeType = type;
          colorTouched = false;
          colorInput.value = quickColors[type] || defaultColors[type];
          syncOptions();
        });
        button.setAttribute('aria-pressed', String(type === activeType));
        optionButtons.set(type, button);
        grid.append(button);
      });

      root.append(grid);
      const colorInput = makeColorPicker(root, quickColors[activeType] || defaultColors[activeType], (color) => {
        quickColors[activeType] = color;
        colorTouched = true;
      });

      root.append(makeButton('Use this material', () => {
        if (colorTouched) quickColors[activeType] = colorInput.value;
        setMaterial(activeType);
        closeMenus();
      }, 'hud-picker-primary'));

      root.append(makeButton('Open color and texture studio', () => {
        if (activeType === 'tall_grass') {
          if (colorTouched) quickColors[activeType] = colorInput.value;
          setMaterial(activeType);
          closeMenus();
          const status = $('status');
          if (status) status.textContent = 'Tall grass uses its natural leafy texture; choose its color above.';
          return;
        }
        if (colorTouched) quickColors[activeType] = colorInput.value;
        setMaterial(activeType);
        closeMenus();
        $('solid-design-open').click();
        if (quickColors[activeType]) {
          $('solid-design-color').value = quickColors[activeType];
          $('solid-design-color').dispatchEvent(new Event('change', { bubbles: true }));
        }
      }));
    });
  }

  function openFlowerPicker() {
    openQuickPicker('Flower color', (root) => {
      const colorInput = makeColorPicker(root, quickColors.flower || defaultColors.flower, (color) => {
        quickColors.flower = color;
      });
      root.append(makeButton('Use this flower color', () => {
        quickColors.flower = colorInput.value;
        setMaterial('flower');
        closeMenus();
      }, 'hud-picker-primary'));
    });
  }

  function openAnimalPicker() {
    const select = $('animal-species');
    openQuickPicker('Choose an animal', (root) => {
      const grid = document.createElement('div');
      grid.className = 'hud-picker-grid animal-picker-grid';
      Array.from(select.options).forEach((option) => {
        const button = makeButton(option.textContent.trim(), () => {
          const placeButton = $('animal-place');
          if (placeButton.textContent.trim().toLowerCase().startsWith('tap the ground to place')) {
            placeButton.click(); // Cancel an older pending placement before switching species.
          }
          select.value = option.value;
          placeButton.click();
          closeMenus();
        });
        grid.append(button);
      });
      root.append(grid);
      const note = document.createElement('p');
      note.className = 'hud-picker-note';
      note.textContent = 'Choose an animal, then tap an open patch of ground to place it.';
      root.append(note);
    });
  }

  function runActivity(activity) {
    if (!setSelectValue('activity-mode', activity, false)) return;
    $('activity-apply').click();
    closeMenus();
  }

  function chooseView(mode) {
    const playButton = $('play-mode');
    const cameraButton = $('camera-mode');
    const inPlayMode = playButton.textContent.trim() === 'Exit Play Mode';

    if (mode === 'build') {
      if (inPlayMode) playButton.click();
      closeMenus();
      return;
    }
    if (mode === 'first' || mode === 'third') {
      if (!inPlayMode) playButton.click();
      const cameraLabel = cameraButton.textContent.trim();
      if (mode === 'first' && cameraLabel === 'First person') cameraButton.click();
      if (mode === 'third' && cameraLabel === 'Third person') cameraButton.click();
      closeMenus();
      return;
    }
    if (mode === 'fullscreen') {
      $('fullscreen-toggle').click();
      closeMenus();
    }
  }

  sleepToggle.addEventListener('click', () => toggleMenu(sleepMenu, sleepToggle));
  viewToggle.addEventListener('click', () => toggleMenu(viewMenu, viewToggle));
  settingsToggle.addEventListener('click', closeMenus);
  $('settings-close').addEventListener('click', closeMenus);
  $('quick-picker-close').addEventListener('click', closeMenus);
  dismissLayer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    closeMenus();
  });

  sleepMenu.querySelectorAll('[data-sleep-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.sleepAction;
      if (action === 'set-bed') $('set-home-bed').click();
      else if (action === 'go-home') $('go-home').click();
      else runActivity(action);
      closeMenus();
    });
  });

  viewMenu.querySelectorAll('[data-view-mode]').forEach((button) => {
    button.addEventListener('click', () => chooseView(button.dataset.viewMode));
  });

  buildToolbar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-hud-tool]');
    if (!button) return;
    const tool = button.dataset.hudTool;

    if (tool === 'inventory') {
      closeMenus();
      $('inventory-open').click();
    } else if (tool === 'tiles') {
      closeMenus();
      setMaterial('tile');
      $('tile-design-open').click();
      syncAllChoiceGroups();
    } else if (tool === 'green') {
      openGreenPicker();
    } else if (tool === 'stone') {
      closeMenus();
      setMaterial('stone');
      $('solid-design-open').click();
      syncAllChoiceGroups();
    } else if (tool === 'dirt') {
      closeMenus();
      setMaterial('dirt');
    } else if (tool === 'water') {
      closeMenus();
      setMaterial('water');
    } else if (tool === 'flower') {
      openFlowerPicker();
    } else if (tool === 'animal') {
      openAnimalPicker();
    }
  });

  $('dance').addEventListener('click', () => runActivity('dance'));
  $('sit').addEventListener('click', () => runActivity('sit'));

  // Refresh active states after the engine restores saved styles or opens a studio.
  ['solid-design-open', 'door-design-open', 'tile-design-open',
   'activity-apply', 'play-mode', 'camera-mode'].forEach((id) => {
    const button = $(id);
    if (button) button.addEventListener('click', syncAllChoiceGroups);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus();
  });

  syncAllChoiceGroups();
  requestAnimationFrame(syncAllChoiceGroups);
})();