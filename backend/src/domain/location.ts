/**
 * 場所マスター（キャンパス -> エリア -> スポット）のドメイン型定義。
 */

export interface LocationSpotEntity {
  id: string;
  area_id: string;
  name: string;
  reference_image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LocationAreaEntity {
  id: string;
  campus: string;
  name: string;
  spots: LocationSpotEntity[];
  created_at: Date;
  updated_at: Date;
}
