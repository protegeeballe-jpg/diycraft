'use strict';
const assert=require('node:assert/strict');
const state=require('../js/exploration-state.js');

const starter=state.createStarterSave(123456);
assert.equal(starter.schema,'the-exploration');
assert.equal(starter.schemaVersion,1);
assert.equal(starter.world.seed,123456);
assert.equal(starter.player.vitality,10);
assert.equal(starter.player.quickbar.length,10);
assert.equal(starter.player.campfire.slots.length,4);
assert.equal(Object.keys(starter.journal.pages).length,0);
assert.throws(()=>state.createStarterSave(-1),/unsigned 32-bit/);
assert.throws(()=>state.createStarterSave(0x100000000),/unsigned 32-bit/);

const gained=state.addItems(starter,'apple',2);
assert.equal(gained.added,true);
const hurt=state.applyDamage(gained.save,3);
assert.equal(hurt.vitality,7);
const ate=state.consumeFood(hurt.save,'apple');
assert.equal(ate.consumed,true);
assert.equal(ate.save.player.vitality,8);
assert.equal(ate.save.player.backpack.apple,1);
const ateAgain=state.consumeFood(ate.save,'apple');
assert.equal(ateAgain.consumed,true);
assert.equal(ateAgain.save.player.vitality,9);
assert.equal(Object.hasOwn(ateAgain.save.player.backpack,'apple'),false);
assert.throws(()=>state.consumeFood(starter,'unknown-food'),/Unknown item/);
const full=state.addItems(starter,'bread',1);
assert.equal(state.consumeFood(full.save,'bread').consumed,false,'Eating at full vitality must not consume food.');
assert.equal(state.applyDamage(starter,10).vitality,0);
const zeroVitality=state.applyDamage(state.applyDamage(starter,10).save,1);
assert.equal(zeroVitality.applied,false);
assert.equal(zeroVitality.save.revision,1,'Damage at zero vitality must be a no-op.');
assert.equal(state.applyDamage(starter,1).vitality,9);
assert.throws(()=>state.applyDamage(starter,0),/Damage/);

const withInventory=state.addItems(starter,'wood',4).save;
const assigned=state.setQuickbarSlot(withInventory,0,'wood');
assert.equal(assigned.updated,true);
const removed=state.removeItems(assigned.save,'wood',4);
assert.equal(removed.removed,true);
assert.equal(removed.save.player.quickbar[0],null,'Removing the last stack must clear quickbar references.');
assert.equal(state.removeItems(starter,'wood',1).removed,false);
assert.equal(state.setQuickbarSlot(starter,0,'wood').updated,false);
assert.throws(()=>state.setQuickbarSlot(starter,10,null),/between zero and nine/);

const journal=state.setJournalPage(starter,252,'  A discovery worth remembering.  ');
assert.equal(journal.journal.pages['252'],'A discovery worth remembering.');
const cleared=state.setJournalPage(journal,252,'  \n ');
assert.equal(Object.hasOwn(cleared.journal.pages,'252'),false,'Whitespace-only journal pages must stay sparse.');
assert.throws(()=>state.setJournalPage(starter,253,'too far'),/between 1 and 252/);
assert.throws(()=>state.setJournalPage(starter,1,'x'.repeat(4001)),/4,000-character/);
assert.equal(state.setJournalPage(starter,1,'x'.repeat(4000)).journal.pages['1'].length,4000);

const progress=state.recordProgress(starter,'lore','legend.library-origin');
assert.equal(progress.recorded,true);
assert.equal(state.recordProgress(progress.save,'lore','legend.library-origin').recorded,false);
assert.throws(()=>state.recordProgress(starter,'unknown','id'),/category/);

const edit=state.setWorldEdit(starter,{x:4,y:0,z:-3,action:'place',itemId:'wood'});
assert.equal(edit.world.edits.length,1);
const replacedEdit=state.setWorldEdit(edit,{x:4,y:0,z:-3,action:'place',itemId:'stone'});
assert.equal(replacedEdit.world.edits.length,1,'Editing the same cell must replace its previous sparse edit.');
assert.equal(replacedEdit.world.edits[0].itemId,'stone');
assert.throws(()=>state.setWorldEdit(starter,{x:513,y:0,z:0,action:'remove'}),/coordinates/);

const normalized=state.validateSave(journal);
assert.deepEqual(normalized,journal);
assert.throws(()=>state.validateSave({...starter,schemaVersion:99}),/supported/);
assert.throws(()=>state.validateSave({...starter,player:{...starter.player,vitality:11}}),/zero to ten/);
assert.throws(()=>state.validateSave({...starter,player:{...starter.player,quickbar:[null]}}),/exactly ten/);
assert.throws(()=>state.validateSave({...starter,journal:{pages:{'253':'bad'}}}),/252/);
assert.throws(()=>state.validateSave({...starter,world:{...starter.world,edits:[
 {x:1,y:0,z:1,action:'place',itemId:'wood'},{x:1,y:0,z:1,action:'remove'}
]}}),/duplicate/);
assert.throws(()=>state.validateSave({...starter,player:{...starter.player,campfire:{slots:['apple',null,null,null],cooking:{active:false,remainingSeconds:0}}}}),/raw plant foods/);
const maxStack=state.addItems(starter,'wood',999);
assert.equal(maxStack.added,true);
const overflowStack=state.addItems(maxStack.save,'wood',1);
assert.equal(overflowStack.added,false,'An item stack must not exceed the per-item limit.');
assert.equal(overflowStack.save.player.backpack.wood,999);
const unsafeBackpack=Object.create(null);
unsafeBackpack.__proto__=1;
assert.throws(()=>state.validateSave({...starter,player:{...starter.player,backpack:unsafeBackpack}}),/forbidden key/);
console.log('The Exploration state, vitality, inventory, journal and validation tests passed.');