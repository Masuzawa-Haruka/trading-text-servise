import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED } from "@/lib/auth/mock";

export type LocationSpot = {
  id: string;
  area_id: string;
  name: string;
  reference_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type LocationArea = {
  id: string;
  campus: string;
  name: string;
  spots: LocationSpot[];
  created_at: string;
  updated_at: string;
};

export type LocationOption = {
  id: string;
  campus: string;
  areaId: string;
  areaName: string;
  name: string;
  imageUrl: string | null;
};

const MOCK_LOCATION_AREAS: LocationArea[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    campus: "豊中キャンパス",
    name: "図書館・共通教育エリア",
    created_at: "2026-05-20T00:00:00.000Z",
    updated_at: "2026-05-20T00:00:00.000Z",
    spots: [
      {
        id: "11111111-1111-4111-8111-111111111201",
        area_id: "11111111-1111-4111-8111-111111111101",
        name: "総合図書館前（入口）",
        reference_image_url: "https://placehold.co/400x300/e2e8f0/64748b?text=Toyonaka+Library",
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
      },
      {
        id: "11111111-1111-4111-8111-111111111202",
        area_id: "11111111-1111-4111-8111-111111111101",
        name: "福利会館（生協・食堂）前",
        reference_image_url: "https://placehold.co/400x300/e2e8f0/64748b?text=Fukuri+Kaikan",
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    campus: "豊中キャンパス",
    name: "駅・正門エリア",
    created_at: "2026-05-20T00:00:00.000Z",
    updated_at: "2026-05-20T00:00:00.000Z",
    spots: [
      {
        id: "11111111-1111-4111-8111-111111111203",
        area_id: "11111111-1111-4111-8111-111111111102",
        name: "石橋阪大前駅（西口改札）",
        reference_image_url: "https://placehold.co/400x300/e2e8f0/64748b?text=Ishibashi+Station",
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
      },
      {
        id: "11111111-1111-4111-8111-111111111204",
        area_id: "11111111-1111-4111-8111-111111111102",
        name: "柴原阪大前駅（改札）",
        reference_image_url: "https://placehold.co/400x300/e2e8f0/64748b?text=Shibahara+Station",
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    campus: "吹田キャンパス",
    name: "理工学図書館エリア",
    created_at: "2026-05-20T00:00:00.000Z",
    updated_at: "2026-05-20T00:00:00.000Z",
    spots: [
      {
        id: "11111111-1111-4111-8111-111111111205",
        area_id: "11111111-1111-4111-8111-111111111103",
        name: "理工学図書館前",
        reference_image_url: "https://placehold.co/400x300/e2e8f0/64748b?text=Suita+Library",
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
      },
      {
        id: "11111111-1111-4111-8111-111111111206",
        area_id: "11111111-1111-4111-8111-111111111103",
        name: "本部前",
        reference_image_url: "https://placehold.co/400x300/e2e8f0/64748b?text=Honbu",
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    campus: "箕面キャンパス",
    name: "キャンパス中央エリア",
    created_at: "2026-05-20T00:00:00.000Z",
    updated_at: "2026-05-20T00:00:00.000Z",
    spots: [
      {
        id: "11111111-1111-4111-8111-111111111207",
        area_id: "11111111-1111-4111-8111-111111111104",
        name: "キャンパス広場前",
        reference_image_url: "https://placehold.co/400x300/e2e8f0/64748b?text=Minoh+Square",
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
      },
    ],
  },
];

export async function getLocationAreas(): Promise<LocationArea[]> {
  if (MOCK_AUTH_ENABLED) {
    return MOCK_LOCATION_AREAS;
  }

  const response = await apiFetch("/api/locations");
  return parseJsonResponse<LocationArea[]>(response, "場所マスターの取得に失敗しました");
}

export async function getLocationOptions(): Promise<LocationOption[]> {
  const areas = await getLocationAreas();
  return areas.flatMap((area) =>
    area.spots.map((spot) => ({
      id: spot.id,
      campus: area.campus,
      areaId: area.id,
      areaName: area.name,
      name: spot.name,
      imageUrl: spot.reference_image_url,
    })),
  );
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
}
