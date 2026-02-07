# クラス設計（中規模・変更多発前提）

## 前提
- 仕様は複数回変更される想定
- `Player` / 敵 / 武器は差し替え可能にする
- 依存は抽象に向ける（DIP）

## 設計方針
- コンポーネント指向 + データ駆動
- 依存方向の統一（上位→抽象）
- ストラテジ/ステートで挙動差し替え
- ファクトリ/レジストリで生成
- イベントバスで疎結合

## レイヤー
- Presentation: UI/HUD、入力
- Domain: ルール・戦闘・移動・AI
- Infrastructure: three.js、物理、リソース

## ゲームループ（更新順序）
1. Input収集
2. ターゲット更新
3. AI更新
4. 移動/物理統合
5. 武器更新/発射
6. 衝突判定
7. ダメージ適用/破壊
8. 描画
9. UI更新

## 主要インターフェース
### IEntity
- `update(dt)`
- `onDamage(damage)`
- `destroy()`

### IControllable
- `applyInput(inputState)`

### IMovement
- `applyForces(input, dt)`
- `integrate(dt)`

### IWeapon
- `triggerStart()` / `triggerEnd()`
- `update(dt)`
- `setOwner(entity)`

### ITargeting
- `acquireTarget(candidates)`
- `getCurrentTarget()`
- `clear()`

### IAIController
- `update(dt)`
- `setTarget(entity)`

## コアクラス
### Game
- 役割: ゲーム進行管理
- 所持: `Scene` / `World` / `InputSystem` / `UI` / `Audio`

### World
- 役割: 空間とエンティティ管理
- 所持: `entities[]`, `spatialIndex`

### EntityManager
- 役割: 生成/破棄/検索
- 依存: `EntityFactory`

### Player (IEntity, IControllable)
- 役割: 自機
- 依存: `IMovement`, `ITargeting`, `IWeapon[]`

### Enemy (IEntity)
- 役割: 敵機基底
- 依存: `IMovement`, `IAIController`, `IWeapon[]`

### WeaponSlot
- 役割: 武装の着脱/有効化

### LaserWeapon (IWeapon)
- 役割: ヒットスキャンレーザー

### FunnelWeapon (IWeapon)
- 役割: ロックオン対象へファンネル攻撃
- 依存: `ITargeting`, `FunnelDrone[]`

### FunnelDrone (IEntity)
- 役割: 個別ファンネル
- 依存: `IMovement`, `IWeapon`（内蔵ビーム）

### TargetingSystem (ITargeting)
- 役割: ロックオン取得
- 依存: `World`, `Camera`

### InputSystem
- 役割: 入力収集
- 出力: `InputState`（移動/射撃/ロックオン/ファンネル）

### CollisionSystem
- 役割: 衝突判定

### UI/HUD
- 役割: HP/シールド/ロックオン表示

## 状態管理
- `PlayerState`: Normal / Boost / Damaged
- `EnemyState`: Patrol / Chase / Evade / Attack

## 依存関係（要点）
- `Player` は `IMovement`/`ITargeting`/`IWeapon` の抽象に依存
- `Enemy` は `IAIController` の抽象に依存
- `Weapon` は `ITargeting` に依存可能（ファンネル向け）

## 拡張例
- 新武装: `IWeapon` 実装を追加し `WeaponSlot` に装着
- 新敵AI: `IAIController` 実装を追加
- 新移動方式: `IMovement` 実装を追加

## ファイル構成（案）
- `src/core`
  - `Game.ts`, `World.ts`, `EntityManager.ts`
- `src/entities`
  - `Player.ts`, `Enemy.ts`, `FunnelDrone.ts`
- `src/systems`
  - `InputSystem.ts`, `TargetingSystem.ts`, `CollisionSystem.ts`
- `src/weapons`
  - `LaserWeapon.ts`, `FunnelWeapon.ts`
- `src/ai`
  - `EnemyAI.ts`
- `src/movement`
  - `SixDoFMovement.ts`
- `src/ui`
  - `HUD.ts`
