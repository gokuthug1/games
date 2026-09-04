/**
 * Weapons — registry of every weapon class.
 * Adding a weapon = adding a class + one line here. Nothing else changes.
 */

import { Cannon } from './Cannon.js';
import { ClusterBomb } from './ClusterBomb.js';
import { Nuke } from './Nuke.js';
import { Splitter } from './Splitter.js';
import { DirtMaker } from './DirtMaker.js';
import { Bouncer } from './Bouncer.js';
import { Homing } from './Homing.js';
import { Drone } from './Drone.js';
import { Fireball } from './Fireball.js';
import { Railgun } from './Railgun.js';
import { Barrage } from './Barrage.js';
import { MineLayer } from './MineLayer.js';
import { AutoTurret } from './AutoTurret.js';
import { EmpWave } from './EmpWave.js';
import { GravityBomb } from './GravityBomb.js';
import { CryoRound } from './CryoRound.js';
import { Leech } from './Leech.js';
import { Shield } from './Shield.js';
import { Airstrike } from './Airstrike.js';
import { OrbitalStrike } from './OrbitalStrike.js';
import { Sniper } from './Sniper.js';
import { Smokescreen } from './Smokescreen.js';
import { Tesla } from './Tesla.js';
import { Sticky } from './Sticky.js';
import { Flashbang } from './Flashbang.js';
import { Napalm } from './Napalm.js';
import { Plasma } from './Plasma.js';
import { Boomerang } from './Boomerang.js';

const REGISTRY = {
  cannon: Cannon,
  cluster: ClusterBomb,
  nuke: Nuke,
  splitter: Splitter,
  dirtmaker: DirtMaker,
  bouncer: Bouncer,
  homing: Homing,
  drone: Drone,
  fireball: Fireball,
  railgun: Railgun,
  barrage: Barrage,
  mine: MineLayer,
  turret: AutoTurret,
  emp: EmpWave,
  gravity: GravityBomb,
  cryo: CryoRound,
  leech: Leech,
  shield: Shield,
  airstrike: Airstrike,
  orbital: OrbitalStrike,
  sniper: Sniper,
  smoke: Smokescreen,
  tesla: Tesla,
  sticky: Sticky,
  flash: Flashbang,
  napalm: Napalm,
  plasma: Plasma,
  boomerang: Boomerang,
};

/** Create a weapon instance bound to a tank. Throws on unknown id. */
export function createWeapon(id, tank) {
  const cls = REGISTRY[id];
  if (!cls) throw new Error(`Unknown weapon id "${id}"`);
  return new cls(tank);
}

/** Get static weapon metadata, or null for unknown ids. */
export function getWeaponDef(id) {
  const cls = REGISTRY[id];
  return cls ? cls.DEF : null;
}

export function isWeaponId(id) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, id);
}

export function isValidWeaponList(ids) {
  return (
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.every((id) => isWeaponId(id))
  );
}

export const ALL_WEAPON_IDS = Object.keys(REGISTRY);

/** Human-readable weapon list for the loadout screens. */
export const WEAPON_CATALOG = ALL_WEAPON_IDS.map((id) => getWeaponDef(id));
