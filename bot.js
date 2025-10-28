
const mineflayer = require('mineflayer')
const { pathfinder, goals: { GoalXZ } } = require('mineflayer-pathfinder')
const autoEat = require('mineflayer-auto-eat').plugin
const pvp = require('mineflayer-pvp').plugin

const SERVER_HOST = process.env.SERVER_HOST || 'play2.eternalzero.cloud'
const SERVER_PORT = Number(process.env.SERVER_PORT || 27199)
const AUTH_MODE   = process.env.AUTH_MODE || 'offline'
const MAX_BOTS    = 1
const JOIN_DELAY_MS = 5000

const NAMES = ['BoLaHackLo']

function wait(ms) { return new Promise(res => setTimeout(res, ms)) }

function createBot(name) {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: name,
    auth: AUTH_MODE
  })

  bot.loadPlugin(pathfinder)
  bot.loadPlugin(autoEat)
  bot.loadPlugin(pvp)

  bot.once('spawn', () => {
    console.log(`[${name}] Spawned!`)
    startFlow(bot)
  })

  bot.on('kicked', r => {
    console.log(`[${name}] kicked:`, r)
    reconnect(name)
  })
  bot.on('end', () => {
    console.log(`[${name}] connection ended`)
    reconnect(name)
  })
  bot.on('error', e => console.log(`[${name}] error:`, e))

  setupLogic(bot)
  return bot
}

function reconnect(name) {
  console.log(`[${name}] Reconnecting in 5s...`)
  setTimeout(() => createBot(name), 5000)
}

function startFlow(bot) {
  // Register / Login / vào server boxpvp
  setTimeout(() => bot.chat('/register 123456789 123456789'), 2000)
  setTimeout(() => bot.chat('/login 123456789'), 5000)
  setTimeout(() => bot.chat('/server boxpvp'), 8000)
  setTimeout(() => bot.chat('/giftcode 40mem'), 12000)
}

// Equip đồ tốt nhất từ inventory
function equipBestGear(bot) {
  const items = bot.inventory.items()
  const slots = {
    head: ['diamond_helmet','netherite_helmet'],
    torso: ['elytra','diamond_chestplate','netherite_chestplate'],
    legs: ['diamond_leggings','netherite_leggings'],
    feet: ['diamond_boots','netherite_boots'],
    hand: ['diamond_sword','netherite_sword','iron_sword']
  }
  for (const [slot, names] of Object.entries(slots)) {
    const item = items.find(i => names.includes(i.name))
    if (item) bot.equip(item, slot).catch(()=>{})
  }
}

// Trade với NPC Slime Newbie
function tradeSlime(bot) {
  const npc = bot.nearestEntity(e => e.displayName === 'Slime Newbie')
  if (npc) {
    bot.trade(npc).then(trade => {
      const recipe = trade.recipes.find(r => r.output.name.includes('firework'))
      if (recipe) trade.trade(recipe, 1).catch(()=>{})
    }).catch(()=>{})
  }
}

// Logic mở shulker và mặc đồ
function setupLogic(bot) {
  bot.on('windowOpen', async (window) => {
    if (window.title.toLowerCase().includes('shulker')) {
      for (const slot of window.slots) {
        if (slot) await bot.clickWindow(slot.slot, 0, 0)
      }
      await window.close()
      equipBestGear(bot)
      setTimeout(() => tradeSlime(bot), 3000)
    }
  })

  // PvP logic
  bot.on('physicTick', () => {
    if (bot.health <= 8) {
      const pos = bot.entity.position.offset(10,0,10)
      bot.pathfinder.setGoal(new GoalXZ(pos.x,pos.z), false)
      return
    }
    const target = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username)
    if (target) {
      if (!bot.pvp.target) bot.pvp.attack(target)
    }
  })

  bot.on('death', () => {
    console.log(`[${bot.username}] Died! Respawn logic...`)
    setTimeout(() => {
      equipBestGear(bot)
      tradeSlime(bot)
    }, 5000)
  })
}

;(async () => {
  for (let i = 0; i < NAMES.length; i++) {
    createBot(NAMES[i])
    await wait(JOIN_DELAY_MS)
  }
})()
