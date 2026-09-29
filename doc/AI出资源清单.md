# AI 出资源清单 —— 逐条执行版

> 本文件是**给出图 AI 的直接执行清单**，共 98 张。每条 prompt 已拼好公共基底，**复制即用，不要改写风格词**。
> 工程规格（方向分级/接入管线）见同目录 `资源需求.md`，与本清单无关，出图时忽略。

## 执行规则（先读）

1. 逐条出图：标题 = 覆盖文件路径（`public/textures/` 下）+ 目标尺寸
2. **No.1~7 的 prompt 已是完整版，复制即用**；**No.8~96 代码块里的 `...base...` 是占位符**，必须按文末"替换基底占位符"的说明先拼接再使用（基底只需复制一次）
3. 出图 1024×1024，后期缩到标注尺寸（缩小比放大清晰）
4. **No.1~96 全部品红底 #FF00FF**（后期抠图转透明 PNG）；**例外：No.97~98 特效用纯黑底 #000000**（ADD 混合模式黑=透明，**免抠图**直接覆盖），**不加地面阴影**，**不加文字**
5. 单位朝向统一**朝右**
6. **No.1~5（地形 5 帧）同一批、同一 seed** 生成，色调必须统一（它们是全项目风格锚点）
7. 每张出 2~4 候选挑最好
8. 抠图后按标题里的路径**同名覆盖**占位文件

**负面提示词（SD 系通用；不支持负面输入的模型忽略此条）**：

```
photorealistic, blurry, side view, front view, multiple objects, sprite sheet, grid layout, complex background, ground plane, text, watermark, human face
```

---

## 批次 1：地图资源（No.1~7，先行）

### 1. `maps/terrain_low.png` — 128×128

```
isometric 2:1 dimetric top-down game asset, sci-fi RTS style inspired by StarCraft, hand-painted stylized texture, soft top-left lighting, muted saturated colors, clean readable silhouette, single object centered, isolated on solid magenta background #FF00FF, no ground shadow, no text, no watermark, a single 2:1 diamond-shaped terrain tile, flat dark green grass (#285228 tone), short even lawn texture, small earthen cliff band along the lower edges, uniform texture suitable for seamless tiling, no unique landmarks
```

### 2. `maps/terrain_high.png` — 128×128

```
isometric 2:1 dimetric top-down game asset, sci-fi RTS style inspired by StarCraft, hand-painted stylized texture, soft top-left lighting, muted saturated colors, clean readable silhouette, single object centered, isolated on solid magenta background #FF00FF, no ground shadow, no text, no watermark, a single 2:1 diamond terrain tile, brighter green grass plateau (#487438 tone) with exposed rocky cliff sides showing elevation, even tiling texture, no landmarks
```

### 3. `maps/terrain_ramp.png` — 128×128

```
isometric 2:1 dimetric top-down game asset, sci-fi RTS style inspired by StarCraft, hand-painted stylized texture, soft top-left lighting, muted saturated colors, clean readable silhouette, single object centered, isolated on solid magenta background #FF00FF, no ground shadow, no text, no watermark, a single 2:1 diamond terrain tile, dirt ramp slope connecting two elevation levels, packed earth texture (#586644 tone), no landmarks
```

### 4. `maps/terrain_water.png` — 128×128

```
isometric 2:1 dimetric top-down game asset, sci-fi RTS style inspired by StarCraft, hand-painted stylized texture, soft top-left lighting, muted saturated colors, clean readable silhouette, single object centered, isolated on solid magenta background #FF00FF, no ground shadow, no text, no watermark, a single 2:1 diamond terrain tile, deep blue water surface (#1c385e tone) with subtle wave ripples, slight shore edge with wet sand border, no landmarks
```

### 5. `maps/terrain_bridge.png` — 128×128

```
isometric 2:1 dimetric top-down game asset, sci-fi RTS style inspired by StarCraft, hand-painted stylized texture, soft top-left lighting, muted saturated colors, clean readable silhouette, single object centered, isolated on solid magenta background #FF00FF, no ground shadow, no text, no watermark, a single 2:1 diamond terrain tile, weathered wooden and metal bridge deck spanning over water, plank texture (#685838 tone), no landmarks
```

### 6. `maps/mineral.png` — 72×80

```
isometric 2:1 dimetric top-down game asset, sci-fi RTS style inspired by StarCraft, hand-painted stylized texture, soft top-left lighting, muted saturated colors, clean readable silhouette, single object centered, isolated on solid magenta background #FF00FF, no ground shadow, no text, no watermark, a resource node: cluster of glowing translucent blue crystals (#3a7fd6 tones) growing from a dark rocky base, sci-fi mineral field, sparkling highlights
```

### 7. `maps/vespene.png` — 80×80

```
isometric 2:1 dimetric top-down game asset, sci-fi RTS style inspired by StarCraft, hand-painted stylized texture, soft top-left lighting, muted saturated colors, clean readable silhouette, single object centered, isolated on solid magenta background #FF00FF, no ground shadow, no text, no watermark, a resource node: small volcanic geyser vent with wisps of green gas rising, cracked rocky base with yellow-green glow, sci-fi vespene geyser
```

---

## 批次 2：人族建筑 terran/（No.8~27，128×128 除注明外）

### 8. `terran/b_cc.png` — 256×256

```
...base..., a terran command center: large industrial sci-fi base building, grey armored plating with blue accent lights, landing pad on top, small antenna array, weathered military texture
```

### 9. `terran/b_sd.png` — 128×128

```
...base..., a terran supply depot: small squat bunker with a raised door ramp, hazard yellow stripes on grey plating, compact industrial design
```

### 10. `terran/b_rf.png` — 128×128

```
...base..., a terran refinery: industrial gas processing station built over a vent, pipes and cylindrical storage tanks, grey metal plating with hazard markings
```

### 11. `terran/b_barracks.png` — 128×128

```
...base..., a terran barracks: medium military bunker building with reinforced blast doors, red accent stripes, ventilation pipes, weathered armor plating
```

### 12. `terran/b_academy.png` — 128×128

```
...base..., a terran academy: military training facility with communication dish and banner poles, grey armored plating, blue window strips
```

### 13. `terran/b_ebay.png` — 128×128

```
...base..., a terran engineering bay: tech upgrade building with rotating radar dish and exposed machinery parts, industrial grey metal
```

### 14. `terran/b_factory.png` — 128×128

```
...base..., a terran factory: heavy vehicle production plant with large garage door and crane arm, industrial grey metal with oil stains
```

### 15. `terran/b_armory.png` — 128×128

```
...base..., a terran armory: weapons upgrade bunker with ammo crates and tool racks beside it, reinforced grey plating
```

### 16. `terran/b_starport.png` — 128×128

```
...base..., a terran starport: aircraft hangar with landing platform and small control tower, industrial grey-blue plating
```

### 17. `terran/b_sci.png` — 128×128

```
...base..., a terran science facility: research complex with large satellite dish and glowing lab windows, white-grey armored plating
```

### 18. `terran/b_bunker.png` — 128×128

```
...base..., a terran bunker: small fortified dugout with firing slits and sandbag ring around it, compact military design
```

### 19. `terran/b_turret.png` — 128×128

```
...base..., a terran missile turret: automated twin missile launcher mounted on a metal base, small targeting radar dish
```

### 20. `terran/b_comsat.png` — 128×128

```
...base..., a terran comsat station: satellite communication add-on module with one large dish antenna, grey plating
```

### 21. `terran/b_nuke.png` — 128×128

```
...base..., a terran nuclear silo: missile silo add-on module with armored round hatch and warning yellow-black stripes
```

### 22. `terran/b_techlab.png` — 128×128

```
...base..., a terran tech lab: laboratory add-on module with glowing green tubes and small antenna array, grey plating
```

### 23. `terran/b_reactor.png` — 128×128

```
...base..., a terran reactor: twin production add-on module with two rotating machinery parts, industrial grey metal
```

### 24. `terran/b_machineshop.png` — 128×128

```
...base..., a terran machine shop: workshop add-on module with mechanical tools and vehicle parts, industrial grey plating
```

### 25. `terran/b_controltower.png` — 128×128

```
...base..., a terran control tower: air traffic control add-on module with glass dome top and small radar, grey plating
```

### 26. `terran/b_physicslab.png` — 128×128

```
...base..., a terran physics lab: research add-on module with tesla coil and glowing energy conduits, grey armored plating
```

### 27. `terran/b_covertops.png` — 128×128

```
...base..., a terran covert ops: stealth operations add-on module with radar array and dark charcoal plating, red accent light
```

## 批次 2：神族建筑 protoss/（No.28~39，128×128 除注明外）

### 28. `protoss/b_nexus.png` — 256×256

```
...base..., a protoss nexus: monumental golden psionic base structure with glowing blue crystal pylons, curved elegant alien architecture
```

### 29. `protoss/b_pylon.png` — 128×128

```
...base..., a protoss pylon: tall crystal monolith glowing with blue psionic energy, small floating fragments around its top
```

### 30. `protoss/b_assimilator.png` — 128×128

```
...base..., a protoss assimilator: elegant gas harvesting structure built over a vent, crystalline extractor arms, golden-blue design
```

### 31. `protoss/b_gateway.png` — 128×128

```
...base..., a protoss gateway: arched warp gate structure with swirling blue portal energy in its frame, golden alien architecture
```

### 32. `protoss/b_forge.png` — 128×128

```
...base..., a protoss forge: golden forging structure with molten light between its plates and floating crystal shards
```

### 33. `protoss/b_cannon.png` — 128×128

```
...base..., a protoss photon cannon: floating glowing orb weapon hovering above a tripod base, blue energy core
```

### 34. `protoss/b_archives.png` — 128×128

```
...base..., a protoss archives: temple archive structure with floating ancient crystals, golden khaydarin monument design
```

### 35. `protoss/b_robofac.png` — 128×128

```
...base..., a protoss robotics facility: advanced machine factory with golden arches and blue energy vents, curved alien plating
```

### 36. `protoss/b_robobay.png` — 128×128

```
...base..., a protoss robotics support bay: hangar add-on module for robotic units, curved golden plating with blue light seams
```

### 37. `protoss/b_stargate.png` — 128×128

```
...base..., a protoss stargate: massive ring-shaped warp portal with cosmic blue glow inside, floating golden structure
```

### 38. `protoss/b_fleetbeacon.png` — 128×128

```
...base..., a protoss fleet beacon: tall beacon tower with pulsing blue light on top, command spire design, golden plating
```

### 39. `protoss/b_arbiter.png` — 128×128

```
...base..., a protoss arbiter tribunal: judicial temple structure with a bending crystal at its center, golden alien design
```

## 批次 2：虫族建筑 zerg/（No.40~55，128×128 除注明外）

### 40. `zerg/b_hatchery.png` — 256×256

```
...base..., a zerg hatchery: organic hive cluster with pulsating membranes, purple-brown flesh, central spawning opening, bioluminescent glow
```

### 41. `zerg/b_lair.png` — 256×256

```
...base..., a zerg lair: evolved hatchery with larger writhing tentacles and glowing green sacs, organic alien horror design
```

### 42. `zerg/b_hive.png` — 256×256

```
...base..., a zerg hive: massive organic hive structure with multiple pulsating pods, dark purple carapace plates, bioluminescent veins
```

### 43. `zerg/b_spawningpool.png` — 128×128

```
...base..., a zerg spawning pool: shallow organic pool with wriggling larvae inside, fleshy rim, purple fluids
```

### 44. `zerg/b_extractor.png` — 128×128

```
...base..., a zerg extractor: organic structure grown over a gas vent, breathing tubes and inflated sacs, purple-brown flesh
```

### 45. `zerg/b_evolution.png` — 128×128

```
...base..., a zerg evolution chamber: organic mutation pit with spiky carapace plates and glowing green core
```

### 46. `zerg/b_creepcolony.png` — 128×128

```
...base..., a zerg creep colony: spiky organic growth with purple tendrils spreading from a central mound
```

### 47. `zerg/b_hydraden.png` — 128×128

```
...base..., a zerg hydralisk den: organic den structure with sharp protruding spines and a protective carapace shell
```

### 48. `zerg/b_queennest.png` — 128×128

```
...base..., a zerg queen's nest: organic nest with crown-like spires and floating spores around it, green-purple flesh
```

### 49. `zerg/b_spire.png` — 128×128

```
...base..., a zerg spire: tall organic tower growing flying creatures inside, membrane sacs and sharp spikes, purple glow
```

### 50. `zerg/b_greaterSpire.png` — 128×128

```
...base..., a zerg greater spire: larger evolved spire with multiple growth pods, dripping mucus, strong purple bioluminescence
```

### 51. `zerg/b_ultracavern.png` — 128×128

```
...base..., a zerg ultralisk cavern: massive underground den entrance framed by huge curved tusks, dark organic carapace
```

### 52. `zerg/b_defilermound.png` — 128×128

```
...base..., a zerg defiler mound: organic mound hosting insect-like creatures, spore vents exhaling green mist
```

### 53. `zerg/b_nydus.png` — 128×128

```
...base..., a zerg nydus canal: organic worm-like tunnel entrance with a gaping maw, pulsating flesh ring, purple colors
```

### 54. `zerg/b_sunken.png` — 128×128

```
...base..., a zerg sunken colony: evolved creep colony mound with a hidden tentacle attack organ, spiked organic shell
```

### 55. `zerg/b_spore.png` — 128×128

```
...base..., a zerg spore colony: evolved creep colony with sac-like anti-air spore launchers on top, organic purple growth
```

---

## 批次 3：人族单位 terran/（No.56~68，128×128 除注明外；朝右）

### 56. `terran/u_scv.png` — 64×64

```
...base..., a terran SCV worker: small round engineering vehicle with a single mechanical arm and cockpit window, orange-yellow armor plating, cute compact proportions, facing right
```

### 57. `terran/u_marine.png` — 64×64

```
...base..., a terran marine: soldier in bulky white-blue power armor holding a gauss rifle, T-visor helmet, heroic stance facing right
```

### 58. `terran/u_firebat.png` — 64×64

```
...base..., a terran firebat: power-armored soldier with dual wrist flamethrowers and back fuel tanks, red-orange armor, facing right
```

### 59. `terran/u_medic.png` — 64×64

```
...base..., a terran medic: power-armored field medic with a medical beam projector arm, white-blue armor with red cross mark, facing right
```

### 60. `terran/u_ghost.png` — 64×64

```
...base..., a terran ghost: stealth operative in sleek dark suit holding a sniper rifle, cloaking shimmer at edges, visor helmet, facing right
```

### 61. `terran/u_vulture.png` — 64×64

```
...base..., a terran vulture: fast hovering motorcycle with a grenade launcher, rugged scavenger design, hovering with slight tilt, facing right
```

### 62. `terran/u_tank.png` — 96×96

```
...base..., a terran siege tank: heavy battle tank with dual cannons and armored treads, industrial military design, facing right
```

### 63. `terran/u_goliath.png` — 96×96

```
...base..., a terran goliath: tall chicken-walker mech with twin autocannons and missile pods on shoulders, grey-orange armor, facing right
```

### 64. `terran/u_dropship.png` — 96×96

```
...base..., a terran dropship: medium flying transport with twin rotor fans and open cargo bay, military grey hull, facing right
```

### 65. `terran/u_wraith.png` — 64×64

```
...base..., a terran wraith: sleek starfighter with twin laser cannons and cloaking shimmer, blue-grey hull, nose pointing right
```

### 66. `terran/u_valkyrie.png` — 96×96

```
...base..., a terran valkyrie: heavy missile frigate aircraft with multiple missile pods on hulled wings, facing right
```

### 67. `terran/u_sciencevessel.png` — 96×96

```
...base..., a terran science vessel: rounded saucer science ship with sensor arrays and antenna dishes, white-grey hull with orange accents
```

### 68. `terran/u_battlecruiser.png` — 96×96

```
...base..., a terran battlecruiser: massive capital warship with laser batteries along the hull and a bridge tower, armored plating, nose pointing right
```

## 批次 3：神族单位 protoss/（No.69~83，128×128 除注明外；朝右）

### 69. `protoss/u_probe.png` — 64×64

```
...base..., a protoss probe: small floating robot with a golden hover orb and a single blue crystal core, one manipulator beam, facing right
```

### 70. `protoss/u_zealot.png` — 64×64

```
...base..., a protoss zealot: warrior with dual glowing blue psionic blades, golden armor faceplate, heroic stance facing right
```

### 71. `protoss/u_dragoon.png` — 96×96

```
...base..., a protoss dragoon: four-legged walker robot with a single large blue plasma cannon, glowing pilot orb in the hull, facing right
```

### 72. `protoss/u_ht.png` — 64×64

```
...base..., a protoss high templar: robed psionic master with glowing energy aura and golden headdress, floating slightly above ground, facing right
```

### 73. `protoss/u_dt.png` — 64×64

```
...base..., a protoss dark templar: cloaked assassin with a single green warp blade, dark armor with faded silhouette edges, facing right
```

### 74. `protoss/u_reaver.png` — 96×96

```
...base..., a protoss reaver: massive scarab-like walker with golden shell plating, deploying a small explosive scarab, facing right
```

### 75. `protoss/u_shuttle.png` — 64×64

```
...base..., a protoss shuttle: sleek hovering transport with curved golden hull and blue engine glow, facing right
```

### 76. `protoss/u_scout.png` — 64×64

```
...base..., a protoss scout: sleek starfighter with twin blue cannons and curved wings with golden trim, nose pointing right
```

### 77. `protoss/u_carrier.png` — 96×96

```
...base..., a protoss carrier: massive capital ship with a curved elongated hull deploying small interceptor drones, golden psionic design, facing right
```

### 78. `protoss/u_arbiter.png` — 96×96

```
...base..., a protoss arbiter: support warship with a crystal Focus array on top, stasis field glow, golden hull, facing right
```

### 79. `protoss/u_observer.png` — 64×64

```
...base..., a protoss observer: small cloaked floating orb with a single sensor eye, faint semi-transparent silhouette
```

### 80. `protoss/u_interceptor.png` — 64×64

```
...base..., a protoss interceptor: small autonomous drone fighter with curved golden design and blue glow, facing right
```

### 81. `protoss/u_corsair.png` — 64×64

```
...base..., a protoss corsair: agile starfighter with a neutron flare weapon underneath, sleek dark blue hull, facing right
```

### 82. `protoss/u_archon.png` — 96×96

```
...base..., a protoss archon: glowing blue energy being, crackling psionic lightning forming a humanoid silhouette, no physical body
```

### 83. `protoss/u_darkarchon.png` — 64×64

```
...base..., a protoss dark archon: crimson red energy being with swirling dark psionic flames forming a humanoid silhouette
```

## 批次 3：虫族单位 zerg/（No.84~96，128×128 除注明外；朝右）

### 84. `zerg/u_drone.png` — 64×64

```
...base..., a zerg drone: small brown insect worker with digging claws and a single eye, organic compact design, facing right
```

### 85. `zerg/u_larva.png` — 64×64

```
...base..., a zerg larva: small wriggling worm-like creature, translucent pale flesh, segmented body
```

### 86. `zerg/u_overlord.png` — 64×64

```
...base..., a zerg overlord: floating balloon-like organism with hanging tentacles, translucent inflated sacs, single large eye
```

### 87. `zerg/u_zergling.png` — 64×64

```
...base..., a zerg zergling: small agile predator with scythe claws on both arms, brown-orange carapace, crouched pouncing stance, facing right
```

### 88. `zerg/u_hydralisk.png` — 64×64

```
...base..., a zerg hydralisk: serpentine predator with an armored head and dart-spitting maw, tall spine crest along its back, facing right
```

### 89. `zerg/u_lurker.png` — 64×64

```
...base..., a zerg lurker: segmented burrowing creature with scythe-like limbs, coiled spring stance, brown-purple carapace, facing right
```

### 90. `zerg/u_queen.png` — 64×64

```
...base..., a zerg queen: flying insectoid with a bloated abdomen and whip-like tentacles, green carapace, facing right
```

### 91. `zerg/u_defiler.png` — 64×64

```
...base..., a zerg defiler: insect-like creature with massive mandibles and dark purple carapace, surrounded by faint spore clouds, facing right
```

### 92. `zerg/u_mutalisk.png` — 64×64

```
...base..., a zerg mutalisk: flying creature with membrane wings and a snake-like tail, orange-brown carapace, glowing attack organ, facing right
```

### 93. `zerg/u_scourge.png` — 64×64

```
...base..., a zerg scourge: small flying bomb creature with tiny wings and a glowing green sac, kamikaze diving pose, facing right
```

### 94. `zerg/u_guardian.png` — 96×96

```
...base..., a zerg guardian: massive flying creature with a long-range acid bombardment organ and a heavy sagging body, dark carapace, facing right
```

### 95. `zerg/u_devourer.png` — 96×96

```
...base..., a zerg devourer: heavy flying creature with a spore-attack maw and bloated dark purple carapace, facing right
```

### 96. `zerg/u_ultralisk.png` — 96×96

```
...base..., a zerg ultralisk: massive four-armed behemoth with huge curved kaiser blades, tank-like armored creature, facing right
```

---

## 批次 4：特效 fx/（No.97~98，纯黑底 ADD 混合）

> 特效是发光粒子，不用等距视角基底，也不用品红抠图——**纯黑底出图直接覆盖即用**（游戏里 ADD 混合黑=透明）。

### 97. `fx/fx_hit.png` — 64×64（命中火花，命中爆点用）

```
game VFX sprite for additive blending, single small impact spark burst: bright white-yellow star flash with radiating streaks and a hot glowing core, radially symmetric, isolated on solid pure black background #000000, no text, no watermark, no frame border
```

### 98. `fx/fx_explosion.png` — 128×128（爆炸云，死亡爆炸用）

```
game VFX sprite for additive blending, single explosion fireball: orange-red flame cloud with a bright yellow core and dark red smoke edges, small debris sparks around, radial burst shape, isolated on solid pure black background #000000, no text, no watermark, no frame border
```

---

## 尾注：替换基底占位符

- 上面代码块里的 `...base...` 是**占位符**，实际拼接前必须替换为下面这段完整基底（不要保留占位符直接出图）：

```
isometric 2:1 dimetric top-down game asset, sci-fi RTS style inspired by StarCraft, hand-painted stylized texture, soft top-left lighting, muted saturated colors, clean readable silhouette, single object centered, isolated on solid magenta background #FF00FF, no ground shadow, no text, no watermark,
```

- 拼接结果 = 基底（含结尾逗号）+ 空格 + 本条对象描述。No.1~7 已是完整 prompt，无需拼接。
