export type MockItem = {
  id: string;
  title: string;
  author: string;
  condition: string;
  campus: string;
  price: number;
  free: boolean;
  status: "available" | "matching" | "completed" | "canceled";
  sellerId: string;
  likes: number;
};

export type MockTransaction = {
  id: string;
  itemId: string;
  sellerId: string;
  buyerId: string;
  status: "proposing" | "scheduled" | "completed" | "canceled";
  finalPrice?: number;
};

export type MockMessage = {
  id: string;
  transactionId: string;
  senderId: string;
  content: string;
  createdAt: string;
  type: "text" | "system";
};

export type MockUser = {
  id: string;
  nickname: string;
  creditScore: number;
};

export type MockLocation = {
  id: string;
  area: string;
  name: string;
  imageUrl: string;
};

export const MOCK_LOCATIONS: MockLocation[] = [
  { id: "l1", area: "豊中キャンパス", name: "総合図書館前（入口）", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Toyonaka+Library" },
  { id: "l2", area: "豊中キャンパス", name: "福利会館（生協・食堂）前", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Fukuri+Kaikan" },
  { id: "l3", area: "豊中キャンパス", name: "メインストリート", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Main+Street" },
  { id: "l4", area: "吹田キャンパス", name: "理工学図書館前", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Suita+Library" },
  { id: "l5", area: "吹田キャンパス", name: "本部前", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Honbu" },
  { id: "l6", area: "吹田キャンパス", name: "センテラス前", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Centerace" },
  { id: "l7", area: "箕面キャンパス", name: "キャンパス広場前", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Minoh+Square" },
  { id: "l8", area: "キャンパス周辺・駅", name: "石橋阪大前駅（西口改札）", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Ishibashi+Station" },
  { id: "l9", area: "キャンパス周辺・駅", name: "柴原阪大前駅（改札）", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Shibahara+Station" },
  { id: "l10", area: "キャンパス周辺・駅", name: "北千里駅", imageUrl: "https://placehold.co/400x300/e2e8f0/64748b?text=Kita-Senri+Station" },
];

const DEFAULT_USERS: MockUser[] = [
  { id: "u1", nickname: "阪大 太郎 (あなた)", creditScore: 100 },
  { id: "u2", nickname: "テスト出品者", creditScore: 120 },
];

const DEFAULT_ITEMS: MockItem[] = [
  {
    id: "i1",
    title: "基礎からの線形代数",
    author: "石村園子",
    condition: "目立った傷や汚れなし",
    campus: "豊中キャンパス",
    price: 0,
    free: true,
    status: "available",
    sellerId: "u2",
    likes: 12,
  },
  {
    id: "i2",
    title: "ミクロ経済学の基礎",
    author: "大山道広",
    condition: "目立った傷や汚れなし",
    campus: "吹田キャンパス",
    price: 300,
    free: false,
    status: "available",
    sellerId: "u2",
    likes: 8,
  },
];

class MockStore {
  private isClient = typeof window !== "undefined";

  private get<T>(key: string, fallback: T): T {
    if (!this.isClient) return fallback;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  }

  private set<T>(key: string, value: T): void {
    if (!this.isClient) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  // --- Users ---
  get currentUser() {
    return DEFAULT_USERS[0];
  }

  getUser(id: string) {
    return DEFAULT_USERS.find((u) => u.id === id) || DEFAULT_USERS[1];
  }

  // --- Locations ---
  getLocations(): MockLocation[] {
    return MOCK_LOCATIONS;
  }

  // --- Items ---
  getItems(): MockItem[] {
    const items = this.get<MockItem[]>("mock_items", []);
    if (items.length === 0) {
      this.set("mock_items", DEFAULT_ITEMS);
      return DEFAULT_ITEMS;
    }
    return items;
  }

  getItem(id: string): MockItem | undefined {
    return this.getItems().find((i) => i.id === id);
  }

  addItem(item: Omit<MockItem, "id" | "status" | "sellerId" | "likes">) {
    const items = this.getItems();
    const newItem: MockItem = {
      ...item,
      id: `i${Date.now()}`,
      status: "available",
      sellerId: this.currentUser.id,
      likes: 0,
    };
    this.set("mock_items", [newItem, ...items]);
    return newItem;
  }

  updateItemStatus(id: string, status: MockItem["status"]) {
    const items = this.getItems();
    const index = items.findIndex((i) => i.id === id);
    if (index >= 0) {
      items[index].status = status;
      this.set("mock_items", items);
    }
  }

  // --- Transactions ---
  getTransactions(): MockTransaction[] {
    return this.get<MockTransaction[]>("mock_transactions", []);
  }

  getTransaction(id: string): MockTransaction | undefined {
    return this.getTransactions().find((t) => t.id === id);
  }

  createTransaction(itemId: string, sellerId: string): MockTransaction {
    const txs = this.getTransactions();
    const newTx: MockTransaction = {
      id: `tx${Date.now()}`,
      itemId,
      sellerId,
      buyerId: this.currentUser.id,
      status: "proposing",
    };
    this.set("mock_transactions", [newTx, ...txs]);
    this.updateItemStatus(itemId, "matching");
    return newTx;
  }

  updateTransactionStatus(id: string, status: MockTransaction["status"]) {
    const txs = this.getTransactions();
    const index = txs.findIndex((t) => t.id === id);
    if (index >= 0) {
      txs[index].status = status;
      this.set("mock_transactions", txs);
    }
  }
  
  updateTransactionPrice(id: string, price: number) {
    const txs = this.getTransactions();
    const index = txs.findIndex((t) => t.id === id);
    if (index >= 0) {
      txs[index].finalPrice = price;
      this.set("mock_transactions", txs);
    }
  }

  // --- Messages ---
  getMessages(txId: string): MockMessage[] {
    const all = this.get<MockMessage[]>("mock_messages", []);
    return all.filter((m) => m.transactionId === txId);
  }

  addMessage(txId: string, content: string, type: "text" | "system" = "text") {
    const all = this.get<MockMessage[]>("mock_messages", []);
    const newMsg: MockMessage = {
      id: `m${Date.now()}`,
      transactionId: txId,
      senderId: this.currentUser.id,
      content,
      createdAt: new Date().toISOString(),
      type,
    };
    this.set("mock_messages", [...all, newMsg]);
  }
}

export const mockStore = new MockStore();
