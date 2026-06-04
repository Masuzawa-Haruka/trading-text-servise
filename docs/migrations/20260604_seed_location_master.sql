-- Seed Osaka University handoff location master data.
-- The IDs are deterministic so this migration can be re-run safely.

INSERT INTO location_areas (id, campus, name)
VALUES
  ('11111111-1111-4111-8111-111111111101', '豊中キャンパス', '図書館・共通教育エリア'),
  ('11111111-1111-4111-8111-111111111102', '豊中キャンパス', '駅・正門エリア'),
  ('11111111-1111-4111-8111-111111111103', '吹田キャンパス', '理工学図書館エリア'),
  ('11111111-1111-4111-8111-111111111104', '吹田キャンパス', '本部・ICホールエリア'),
  ('11111111-1111-4111-8111-111111111105', '箕面キャンパス', 'キャンパス中央エリア')
ON CONFLICT (id) DO UPDATE
SET
  campus = EXCLUDED.campus,
  name = EXCLUDED.name,
  updated_at = NOW();

INSERT INTO location_spots (id, area_id, name, reference_image_url)
VALUES
  (
    '11111111-1111-4111-8111-111111111201',
    '11111111-1111-4111-8111-111111111101',
    '総合図書館前（入口）',
    'https://placehold.co/400x300/e2e8f0/64748b?text=Toyonaka+Library'
  ),
  (
    '11111111-1111-4111-8111-111111111202',
    '11111111-1111-4111-8111-111111111101',
    '福利会館（生協・食堂）前',
    'https://placehold.co/400x300/e2e8f0/64748b?text=Fukuri+Kaikan'
  ),
  (
    '11111111-1111-4111-8111-111111111203',
    '11111111-1111-4111-8111-111111111102',
    '石橋阪大前駅（西口改札）',
    'https://placehold.co/400x300/e2e8f0/64748b?text=Ishibashi+Station'
  ),
  (
    '11111111-1111-4111-8111-111111111204',
    '11111111-1111-4111-8111-111111111102',
    '柴原阪大前駅（改札）',
    'https://placehold.co/400x300/e2e8f0/64748b?text=Shibahara+Station'
  ),
  (
    '11111111-1111-4111-8111-111111111205',
    '11111111-1111-4111-8111-111111111103',
    '理工学図書館前',
    'https://placehold.co/400x300/e2e8f0/64748b?text=Suita+Library'
  ),
  (
    '11111111-1111-4111-8111-111111111206',
    '11111111-1111-4111-8111-111111111104',
    '本部前',
    'https://placehold.co/400x300/e2e8f0/64748b?text=Honbu'
  ),
  (
    '11111111-1111-4111-8111-111111111207',
    '11111111-1111-4111-8111-111111111104',
    'ICホール前',
    'https://placehold.co/400x300/e2e8f0/64748b?text=IC+Hall'
  ),
  (
    '11111111-1111-4111-8111-111111111208',
    '11111111-1111-4111-8111-111111111105',
    'キャンパス広場前',
    'https://placehold.co/400x300/e2e8f0/64748b?text=Minoh+Square'
  )
ON CONFLICT (id) DO UPDATE
SET
  area_id = EXCLUDED.area_id,
  name = EXCLUDED.name,
  reference_image_url = EXCLUDED.reference_image_url,
  updated_at = NOW();
