/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Interactive Tactical Tutorial System (Boot Camp)
 * 
 * Strict Zero-Emoji Policy: All iconography rendered via SVG/Canvas vector paths.
 */

import { state, GAME_SCREENS, GAME_MODES } from '../core/state.js';
import { events, EVENTS } from '../core/events.js';
import { storage } from '../core/storage.js';
import { audio } from '../core/audio.js';
import { getIcon } from '../rendering/svg_icons.js';

export const TUTORIAL_STEPS = [
  {
    id: 'intro',
    title: 'TACTICAL BRIEFING // AEGIS PROTOCOL',
    badge: 'STAGE 01 / 08',
    message: 'Welcome to Command, Commander. Invading vector hostile forces will attempt to breach our defense perimeter. Enemies spawn at the green node and march along the conduit line toward our core Aegis generator (red node). If hostiles reach the core, lives are lost.',
    task: 'Review the battlefield layout and press PROCEED to begin battery deployment.',
    buttonText: 'PROCEED',
    highlightTarget: '#canvas-wrapper',
    autoAdvanceOnEvent: null
  },
  {
    id: 'place_gatling',
    title: 'DEPLOYING DEFENSE BATTERIES',
    badge: 'STAGE 02 / 08',
    message: 'Select the <b>Gatling Sentry</b> (or press [1] on your keyboard). Then hover over the defense grid and click on an empty tile near the path to construct your first autocannon.',
    task: 'Select and place a Gatling Sentry on any valid grid tile.',
    buttonText: null, // Waits for user action
    highlightTarget: '#tower-build-dock',
    autoAdvanceOnEvent: EVENTS.TOWER_PLACED
  },
  {
    id: 'special_tiles',
    title: 'TACTICAL TERRAIN & SPECIAL NODES',
    badge: 'STAGE 03 / 08',
    message: 'Look closely at the grid. Blue glowing nodes provide <b>High Ground</b> (+15% Range & +10% Damage), purple nodes are <b>Power Grids</b> (reduced cooldowns), and amber nodes are <b>Amplifiers</b> (+25% Critical Strike Chance). Place batteries strategically on these nodes!',
    task: 'Understand tactical terrain bonuses. Press PROCEED to continue.',
    buttonText: 'PROCEED',
    highlightTarget: '#canvas-wrapper',
    autoAdvanceOnEvent: null
  },
  {
    id: 'start_wave',
    title: 'COMMENCE COMBAT // FIRST WAVE',
    badge: 'STAGE 04 / 08',
    message: 'Hostile scouts are approaching! Click the <b>NEXT WAVE</b> button in the top HUD (or press [N]) to open the defense corridor and engage the enemy.',
    task: 'Click NEXT WAVE or press [N] to start Wave 1.',
    buttonText: null,
    highlightTarget: '#btn-wave-start',
    autoAdvanceOnEvent: EVENTS.WAVE_START
  },
  {
    id: 'speed_controls',
    title: 'COMBAT VELOCITY & PAUSE',
    badge: 'STAGE 05 / 08',
    message: 'You can control battlefield simulation speed. Press <b>[Space]</b> to pause/resume the battle, or press <b>[F]</b> (or click the speed button) to cycle between 1x, 2x, 4x, and 8x speed.',
    task: 'Try cycling speed or pausing, then press PROCEED.',
    buttonText: 'PROCEED',
    highlightTarget: '#btn-speed-toggle',
    autoAdvanceOnEvent: null
  },
  {
    id: 'tower_inspect_upgrade',
    title: 'LIVE INSPECTION & UPGRADES',
    badge: 'STAGE 06 / 08',
    message: 'Click directly on any placed tower to open the <b>Live Inspector Drawer</b> on the right. Here you can upgrade towers to Tier 2 and Tier 3, or configure their <b>Targeting Protocol</b> (First, Strongest, Flying, Weakest). At Tier 3, you can choose specialized <b>Apex Branches</b>!',
    task: 'Click on a placed tower to inspect it, or press PROCEED.',
    buttonText: 'PROCEED',
    highlightTarget: '#tower-inspector-drawer',
    autoAdvanceOnEvent: null
  },
  {
    id: 'commander_abilities',
    title: 'COMMANDER ACTIVE POWERS',
    badge: 'STAGE 07 / 08',
    message: 'On the left dock are your 5 Commander Powers: <b>[Q] Orbital Beam Strike</b>, <b>[W] Cryo Flash Freeze</b>, <b>[E] EMP Blackout Pulse</b>, <b>[R] Nanite Overclock</b>, and <b>[T] Supply Drop</b>. These consume Energy from your rechargeable energy grid.',
    task: 'Examine Commander tactical powers. Press PROCEED to continue.',
    buttonText: 'PROCEED',
    highlightTarget: '#commander-abilities-dock',
    autoAdvanceOnEvent: null
  },
  {
    id: 'graduation',
    title: 'BOOT CAMP COMPLETE // DEPLOY TO CAMPAIGN',
    badge: 'GRADUATED',
    message: 'Outstanding performance, Commander! You are now fully trained in tactical defense, element counters, weapon specialization, and orbital support. You have been awarded <b>+5 Research Credits</b> in the Research Lab.',
    task: 'Press COMMENCE CAMPAIGN to enter the 8 Sector Campaign theaters.',
    buttonText: 'COMMENCE CAMPAIGN',
    highlightTarget: null,
    autoAdvanceOnEvent: null
  }
];

export class TutorialController {
  constructor() {
    this.currentStepIndex = 0;
    this.isActive = false;
    this.overlayEl = null;
    this.initDOM();
    this.initEventListeners();
  }

  initDOM() {
    if (typeof document === 'undefined') return;
    // Create tutorial overlay element if not present
    let overlay = document.getElementById('tutorial-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tutorial-modal-overlay';
      overlay.className = 'tutorial-overlay';
      overlay.innerHTML = `
        <div class="tutorial-card">
          <div class="tutorial-header">
            <div class="tutorial-badge" id="tut-badge">STAGE 01 / 08</div>
            <div class="tutorial-title" id="tut-title">TACTICAL BRIEFING</div>
          </div>
          <div class="tutorial-body" id="tut-message"></div>
          <div class="tutorial-task-box">
            <div class="tutorial-task-label">${getIcon('TARGET')} DIRECTIVE:</div>
            <div class="tutorial-task-desc" id="tut-task"></div>
          </div>
          <div class="tutorial-footer">
            <button id="tut-btn-skip" class="btn-cyber" style="padding: 8px 14px; font-size: 11px;">SKIP TUTORIAL</button>
            <button id="tut-btn-action" class="btn-cyber primary" style="padding: 8px 20px; font-size: 12px;">PROCEED</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    this.overlayEl = overlay;

    document.getElementById('tut-btn-action')?.addEventListener('click', () => {
      this.advanceStep();
    });

    document.getElementById('tut-btn-skip')?.addEventListener('click', () => {
      this.endTutorial(false);
    });
  }

  initEventListeners() {
    events.on(EVENTS.TOWER_PLACED, () => {
      if (this.isActive && this.getCurrentStep()?.autoAdvanceOnEvent === EVENTS.TOWER_PLACED) {
        setTimeout(() => this.advanceStep(), 400);
      }
    });

    events.on(EVENTS.WAVE_START, () => {
      if (this.isActive && this.getCurrentStep()?.autoAdvanceOnEvent === EVENTS.WAVE_START) {
        setTimeout(() => this.advanceStep(), 400);
      }
    });
  }

  startTutorial() {
    this.isActive = true;
    this.currentStepIndex = 0;
    if (!this.overlayEl) this.initDOM();

    // Launch tutorial mission on map_01 with sandbox parameters
    events.emit('game:start_mission', { mapId: 'map_01', mode: GAME_MODES.SANDBOX });
    
    setTimeout(() => {
      this.showStep(0);
    }, 300);
  }

  getCurrentStep() {
    return TUTORIAL_STEPS[this.currentStepIndex];
  }

  showStep(index) {
    this.currentStepIndex = index;
    const step = TUTORIAL_STEPS[index];
    if (!step) {
      this.endTutorial(true);
      return;
    }

    if (this.overlayEl) {
      this.overlayEl.classList.add('active');
      document.getElementById('tut-badge').textContent = step.badge;
      document.getElementById('tut-title').textContent = step.title;
      document.getElementById('tut-message').innerHTML = step.message;
      document.getElementById('tut-task').textContent = step.task;

      const actionBtn = document.getElementById('tut-btn-action');
      if (actionBtn) {
        if (step.buttonText) {
          actionBtn.style.display = 'inline-flex';
          actionBtn.textContent = step.buttonText;
        } else {
          actionBtn.style.display = 'none';
        }
      }
    }

    // Highlight target element if specified
    this.clearHighlights();
    if (step.highlightTarget) {
      const target = document.querySelector(step.highlightTarget);
      if (target) {
        target.classList.add('tutorial-highlight');
      }
    }

    audio.playUIClick();
  }

  advanceStep() {
    if (this.currentStepIndex >= TUTORIAL_STEPS.length - 1) {
      this.endTutorial(true);
      return;
    }
    this.showStep(this.currentStepIndex + 1);
  }

  clearHighlights() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  }

  endTutorial(completed = true) {
    this.isActive = false;
    this.clearHighlights();
    if (this.overlayEl) {
      this.overlayEl.classList.remove('active');
    }

    if (completed) {
      // Award research points and unlock achievement
      storage.addResearchPoints(5);
      audio.playVictory();
      events.emit(EVENTS.TOAST_NOTIFY, {
        title: 'BOOT CAMP GRADUATION',
        message: 'Graduated from Tactical Training! +5 Research Points Awarded.',
        type: 'achievement'
      });
    }

    // Navigate to campaign selection screen
    events.emit('ui:show_screen', { screenId: GAME_SCREENS.CAMPAIGN_SELECT });
  }
}

export const tutorial = new TutorialController();
