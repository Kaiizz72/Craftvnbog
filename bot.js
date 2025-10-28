const mineflayer = require('mineflayer')
const { pathfinder, goals: { GoalXZ } } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin

const SERVER_HOST = process.env.SERVER_HOST || 'play.craftvn.net'
const SERVER_PORT = Number(process.env.SERVER_PORT || 25565)
const AUTH_MODE   = process.env.AUTH_MODE || 'offline'
const MAX_BOTS    = 1
const JOIN_DELAY_MS = 15000 // 15s mỗi bot

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
  bot.loadPlugin(pvp)

  bot.once('spawn', () => {
    console.log(`[${name}] Spawned!`)
    startFlow(bot, false) // lần đầu
  })

  bot.on('kicked', r => {
    try {
      console.log(`[${name}] kicked: ${JSON.stringify(r, null, 2)}`)
    } catch {
      console.log(`[${name}] kicked:`, r)
    }
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
  console.log(`[${name}] Reconnecting in 60s...`)
  setTimeout(() => {
    const bot = createBot(name)
    bot.once('spawn', () => startFlow(bot, true)) // flow reconnect
  }, 60000)
}

// Flow lần đầu & reconnect
function startFlow(bot, isReconnect = false) {
  if (!isReconnect) {
    setTimeout(() => bot.chat('/register 123456789 123456789'), 5000)
    setTimeout(() => bot.chat('/login 123456789'), 10000)
    setTimeout(() => bot.chat('/server boxpvp'), 18000)
    setTimeout(() => bot.chat('/giftcode 40mem'), 30000)
  } else {
    setTimeout(() => bot.chat('/login 123456789'), 5000)
    setTimeout(() => bot.chat('/server boxpvp'), 10000)
    setTimeout(() => bot.chat('/giftcode 40mem'), 20000)
  }
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

// Logic mở shulker, mặc đồ, pvp
function setupLogic(bot) {
  bot.on('windowOpen', async (window) => {
    if (window.title.toLowerCase().includes('shulker')) {
      for (const slot of window.slots) {
        if (slot) await bot.clickWindow(slot.slot, 0, 0)
      }
      await window.close()
      equipBestGear(bot)
    }
  })

  // PvP logic
  bot.on('physicsTick', () => {
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
    }, 5000)
  })
}

// Chạy bot
;(async () => {
  for (let i = 0; i < NAMES.length; i++) {
    createBot(NAMES[i])
    await wait(JOIN_DELAY_MS)
  }
})()
