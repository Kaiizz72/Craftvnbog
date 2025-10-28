const mineflayer = require('mineflayer')
const { pathfinder, goals: { GoalXZ } } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin

// ===== CONFIG =====
const SERVER_HOST = process.env.SERVER_HOST || 'play.craftvn.net'
const SERVER_PORT = Number(process.env.SERVER_PORT || 25565)
const AUTH_MODE   = process.env.AUTH_MODE || 'offline'   // 'offline' hoặc 'microsoft'
const VERSION     = process.env.VERSION || '1.21.1'      // chỉnh đúng version server
const NAMES       = ['BoLaHackLoo']                      // tên bot
const JOIN_DELAY_MS = 15000

// ===== CREATE BOT =====
function createBot(name, isReconnect = false) {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: name,
    auth: AUTH_MODE,
    version: VERSION
  })

  bot.loadPlugin(pathfinder)
  bot.loadPlugin(pvp)

  bot.once('spawn', () => {
    console.log(`[${name}] Spawned!`)
    startFlow(bot, isReconnect)
  })

  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    console.log(`[Chat] <${username}> ${message}`)
  })

  bot.on('kicked', reason => {
    console.log(`[${name}] kicked: ${JSON.stringify(reason, null, 2)}`)
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

// ===== FLOWS =====
function startFlow(bot, isReconnect) {
  if (!isReconnect) {
    // lần đầu vào
    setTimeout(() => bot.chat('/register 123456789 123456789'), 5000)
    setTimeout(() => bot.chat('/login 123456789'), 10000)
    setTimeout(() => bot.chat('/server boxpvp'), 18000)
    setTimeout(() => bot.chat('/giftcode 40mem'), 30000)
  } else {
    // reconnect
    setTimeout(() => bot.chat('/login 123456789'), 5000)
    setTimeout(() => bot.chat('/server boxpvp'), 10000)
    setTimeout(() => bot.chat('/giftcode 40mem'), 20000)
  }
}

function reconnect(name) {
  console.log(`[${name}] Reconnecting in 60s...`)
  setTimeout(() => createBot(name, true), 60000)
}

// ===== LOGIC =====
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

  bot.on('physicsTick', () => {
    if (bot.health <= 8) {
      const pos = bot.entity.position.offset(10,0,10)
      bot.pathfinder.setGoal(new GoalXZ(pos.x,pos.z), false)
      return
    }
    const target = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username)
    if (target && !bot.pvp.target) bot.pvp.attack(target)
  })

  bot.on('death', () => {
    console.log(`[${bot.username}] Died! Respawn logic...`)
    setTimeout(() => equipBestGear(bot), 5000)
  })
}

// ===== RUN MULTI BOT =====
;(async () => {
  for (let i = 0; i < NAMES.length; i++) {
    createBot(NAMES[i], false)
    await new Promise(res => setTimeout(res, JOIN_DELAY_MS))
  }
})()
