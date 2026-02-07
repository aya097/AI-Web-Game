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

※更新の起点は `Game`。`Game` が `World` と各 `System` を順序通りに呼び出す。
`World` はエンティティ集合と空間インデックスを保持し、`System` は `World` に対して読み書きする。

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
- 更新起点: すべての `System` 更新は `Game` が呼び出す

### World
- 役割: 空間とエンティティ管理
- 所持: `entities[]`, `spatialIndex`
- 所有権: エンティティの生存管理（生成/破棄は `EntityManager` 経由）

### EntityManager
- 役割: 生成/破棄/検索
- 依存: `EntityFactory`
- 所有権: 生成と破棄の受付、`World` への登録/解除を実行

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

## イベントバス仕様
- 方式: 同期イベント（同一フレーム内で即時ディスパッチ）
- 順序: 登録順。`Game` の更新順序を跨いでのディスパッチは禁止（同一 `System` 内で完結）
- 用途: UI通知、効果音/エフェクト、実績/ログ
- 代表イベント:
  - `DamageApplied { sourceId, targetId, amount, isShield }`
  - `EntityDestroyed { entityId, reason }`
  - `LockOnAcquired { ownerId, targetId }`
  - `WeaponFired { ownerId, weaponId }`

## データ駆動仕様
- フォーマット: JSON（`/assets/config/*.json`）
- バージョン: `schemaVersion` を必須化し、破壊的変更は `v+1` を作成
- 検証: 起動時にJSONスキーマ検証（不正値はログ + デフォルトにフォールバック）
- ホットリロード: 開発時のみ有効（変更検知で再読み込み、実行中エンティティは次リスポーンから反映）

## 時間管理/物理
- タイムステップ: 固定 1/60 秒。`Game` がアキュムレータで積分し、`dt` は最大 1/15 にクランプ
- 積分: Semi-Implicit Euler
- 速度上限: `IMovement` で速度ベクトルのノルムをクランプ

## 衝突/空間分割
- 形状: 自機/敵機/ファンネルは球、障害物は球/カプセル
- 空間分割: 固定グリッド（セルサイズ 50m）
- 目的: 60fps維持のため当たり判定候補をセル内に限定

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
