# TODO: 3D宇宙アクションゲーム

## 直近（次に作る要素）
- [ ] `TargetingSystem`：距離/視野角/優先度ロジック
- [ ] `LaserWeapon`：ヒットスキャン/連射/射程/ダメージ
- [ ] `CollisionSystem`：球コライダー判定/ヒット結果
- [ ] HP/シールド/被弾処理（`IEntity.onDamage()`）
- [ ] HUD拡張：HP/シールド/ブースト/ロックオン表示
- [ ] 追従カメラ：スムージング/被弾シェイク
- [ ] `Enemy` + 最小AI（Patrol/Chase/Attack）
- [ ] `EntityManager`/`Factory` の使用開始

## 中期
- [ ] `FunnelWeapon`/`FunnelDrone` 実装
- [ ] スコア/残機/勝敗判定
- [ ] イベントバス導入（`DamageApplied` 等）
- [ ] 空間分割（固定グリッド 50m）
- [ ] ステージ障害物生成
- [ ] レーダーUI/演出追加

## 長期
- [ ] データ駆動（JSON/スキーマ/ホットリロード）
- [ ] 画面遷移（Title/Result）
- [ ] BGM/SE/演出強化
- [ ] 敵種（Grunt/Ace）と出現パターン
- [ ] パフォーマンス制約の監視と最適化
