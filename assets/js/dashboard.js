import { redirectForAccess, requireAccess } from "./auth.js?v=20261003c";
import {
  create,
  formatNumber,
  initCommon,
  setState,
  setWhatsappLink
} from "./common.js?v=20261003c";
import {
  db,
  createLotImageSignedUrl
} from "./supabase.js?v=20261003c";
import { language, t } from "./i18n.js?v=20261003c";

initCommon();

let lots = [];
let loadStatus = "loading";
let currentLot = null;
let filteredLots = [];

const filters = {
  search: "",
  type: "",
  region: "",
  status: "",
  minPrice: "",
  maxPrice: ""
};

let currentBuyer = {
  fullName: "",
  companyName: "",
  loginEmail: "",
  inn: ""
};

const productKeys = {
  cattle: "cattle",
  sheep: "sheep",
  horse: "horse",
  yak: "yak",
  selection: "selection"
};

const statusKeys = {
  available: "available",
  reserved: "reserved",
  sold: "sold",
  closed: "closed"
};


/* =========================================================
   LOT TRANSLATIONS
   ========================================================= */

const lotTranslations = {
  "001": {
    breed: {
      ru: "Швицкая порода (Бычки)",
      ky: "Швиц тукуму (Букачалар)",
      en: "Simmental breed (Young bulls)"
    },

    region: {
      ru: "Чуйская область, Сокулукский район",
      ky: "Чүй облусу, Сокулук району",
      en: "Chuy Region, Sokuluk District"
    },

    feed_type: {
      ru: "Зерновой интенсивный откорм",
      ky: "Дан азыгы менен интенсивдүү семиртүү",
      en: "Intensive grain feeding"
    },

    contract_label: {
      ru: "Разовая поставка",
      ky: "Бир жолку жеткирүү",
      en: "One-time delivery"
    },

    primary_metric_label: {
      ru: "СОСТОЯНИЕ",
      ky: "АБАЛЫ",
      en: "CONDITION"
    },

    primary_metric_value: {
      ru: "Высшая упитанность",
      ky: "Жогорку семиздик",
      en: "Prime condition"
    },

    price_note: {
      ru: "В туше",
      ky: "Тушада",
      en: "Carcass weight"
    },

    status_note: {
      ru: "ЛОТ ЗАБРОНИРОВАН",
      ky: "ЛОТ БРОНДОЛГОН",
      en: "LOT RESERVED"
    },

    action_note: {
      ru: "ЛОТ ЗАБЛОКИРОВАН ДЛЯ ДРУГИХ УЧАСТНИКОВ",
      ky: "ЛОТ БАШКА КАТЫШУУЧУЛАР ҮЧҮН БӨГӨТТӨЛГӨН",
      en: "LOT BLOCKED FOR OTHER PARTICIPANTS"
    },

    price_unit: {
      ru: "сом / кг",
      ky: "сом / кг",
      en: "KGS / kg"
    }
  },

  "002": {
    breed: {
      ru: "Гиссарская порода (Молодые бараны)",
      ky: "Гиссар тукуму (Жаш кочкорлор)",
      en: "Gissar breed (Young rams)"
    },

    region: {
      ru: "Чуйская область, Аламединский район",
      ky: "Чүй облусу, Аламүдүн району",
      en: "Chuy Region, Alamüdün District"
    },

    feed_type: {
      ru: "Предгорный нагул + докорм ячменем",
      ky: "Этектеги жайытта багуу + арпа менен кошумча тоюттандыруу",
      en: "Foothill grazing + barley supplementation"
    },

    contract_label: {
      ru: "Разовая поставка",
      ky: "Бир жолку жеткирүү",
      en: "One-time delivery"
    },

    price_note: {
      ru: "В туше",
      ky: "Тушада",
      en: "Carcass weight"
    },

    status_note: {
      ru: "ОТКРЫТА ТОРГОВАЯ СЕССИЯ",
      ky: "СООДА СЕССИЯСЫ АЧЫК",
      en: "TRADING SESSION OPEN"
    },

    action_note: {
      ru: "",
      ky: "",
      en: ""
    },

    price_unit: {
      ru: "сом / кг",
      ky: "сом / кг",
      en: "KGS / kg"
    }
  },

  "003": {
    breed: {
      ru: "Новокиргизская порода (Кони на согым)",
      ky: "Новокыргыз тукуму (Согумга арналган аттар)",
      en: "Novo-Kyrgyz breed (Horses for sogum)"
    },

    region: {
      ru: "Таласская область, Бакай-Атинский район",
      ky: "Талас облусу, Бакай-Ата району",
      en: "Talas Region, Bakai-Ata District"
    },

    feed_type: {
      ru: "Клевер + кукуруза",
      ky: "Беде + жүгөрү",
      en: "Clover + corn"
    },

    contract_label: {
      ru: "Разовая поставка",
      ky: "Бир жолку жеткирүү",
      en: "One-time delivery"
    },

    primary_metric_label: {
      ru: "УПИТАННОСТЬ",
      ky: "СЕМИЗДИК",
      en: "CONDITION"
    },

    primary_metric_value: {
      ru: "Высшая",
      ky: "Жогорку",
      en: "Prime"
    },

    price_note: {
      ru: "Оптом в круг",
      ky: "Дүң баа",
      en: "Wholesale all-in price"
    },

    status_note: {
      ru: "ТОРГИ ЗАКРЫТЫ",
      ky: "СООДА ЖАБЫК",
      en: "TRADING CLOSED"
    },

    action_note: {
      ru: "ТОРГИ ЗАКРЫТЫ",
      ky: "СООДА ЖАБЫК",
      en: "TRADING CLOSED"
    },

    price_unit: {
      ru: "сом / голову",
      ky: "сом / башка",
      en: "KGS / head"
    }
  },

  "004": {
    breed: {
      ru: "Абердин-Ангус (Племенные быки-производители)",
      ky: "Абердин-Ангус (Асыл тукум бука-өндүргүчтөр)",
      en: "Aberdeen Angus (Breeding bulls)"
    },

    region: {
      ru: "Чуйская область, Ысык-Атинский район",
      ky: "Чүй облусу, Ысык-Ата району",
      en: "Chuy Region, Ysyk-Ata District"
    },

    contract_label: {
      ru: "Селекционный выкуп / Воспроизводство стада",
      ky: "Селекциялык сатып алуу / Үйүрдү көбөйтүү",
      en: "Breeding purchase / Herd reproduction"
    },

    primary_metric_label: {
      ru: "ДОКУМЕНТЫ",
      ky: "ДОКУМЕНТТЕР",
      en: "DOCUMENTS"
    },

    primary_metric_value: {
      ru: "Племенные свидетельства, чипы ИСЖ, карты вакцинации",
      ky: "Асыл тукум күбөлүктөрү, ИСЖ чиптери, эмдөө карталары",
      en: "Breeding certificates, ISZH chips, vaccination records"
    },

    price_note: {
      ru: "Племенной лот",
      ky: "Асыл тукум лот",
      en: "Breeding lot"
    },

    status_note: {
      ru: "ТОРГИ ЗАКРЫТЫ",
      ky: "СООДА ЖАБЫК",
      en: "TRADING CLOSED"
    },

    action_note: {
      ru: "ТОРГИ ЗАКРЫТЫ",
      ky: "СООДА ЖАБЫК",
      en: "TRADING CLOSED"
    },

    price_unit: {
      ru: "сом / голову",
      ky: "сом / башка",
      en: "KGS / head"
    }
  },

  "005": {
    breed: {
      ru: "Высокогорный Топоз (Самцы на убой)",
      ky: "Бийик тоолуу топоз (Эркек топоздор союуга)",
      en: "Highland yak (Males for slaughter)"
    },

    region: {
      ru: "Нарынская область, Ат-Башинский район (Высокогорные сырты)",
      ky: "Нарын облусу, Ат-Башы району (Бийик тоолуу сырттар)",
      en: "Naryn Region, At-Bashy District (Highland pastures)"
    },

    feed_type: {
      ru: "Экологический высокогорный нагул",
      ky: "Экологиялык бийик тоолуу жайыттагы багуу",
      en: "Highland natural grazing"
    },

    contract_label: {
      ru: "Среднесрочный форвард",
      ky: "Орто мөөнөттүү форвард",
      en: "Medium-term forward"
    },

    tertiary_metric_label: {
      ru: "ПОСТАВКА",
      ky: "ЖЕТКИРҮҮ",
      en: "DELIVERY"
    },

    tertiary_metric_value: {
      ru: "Октябрь 2026",
      ky: "2026-жылдын октябры",
      en: "October 2026"
    },

    price_note: {
      ru: "В туше",
      ky: "Тушада",
      en: "Carcass weight"
    },

    status_note: {
      ru: "ЛОТ ЗАБРОНИРОВАН",
      ky: "ЛОТ БРОНДОЛГОН",
      en: "LOT RESERVED"
    },

    action_note: {
      ru: "ЛОТ ЗАБЛОКИРОВАН ДЛЯ ДРУГИХ УЧАСТНИКОВ",
      ky: "ЛОТ БАШКА КАТЫШУУЧУЛАР ҮЧҮН БӨГӨТТӨЛГӨН",
      en: "LOT BLOCKED FOR OTHER PARTICIPANTS"
    },

    price_unit: {
      ru: "сом / кг",
      ky: "сом / кг",
      en: "KGS / kg"
    }
  },

  "006": {
    breed: {
      ru: "Местная тонкорунная порода (Овцы / Токтолу)",
      ky: "Жергиликтүү уяң жүндүү тукум (Койлор / Токтолу)",
      en: "Local fine-wool breed (Sheep / Toktolu)"
    },

    region: {
      ru: "Нарынская область, Кочкорский район",
      ky: "Нарын облусу, Кочкор району",
      en: "Naryn Region, Kochkor District"
    },

    contract_label: {
      ru: "Разовая поставка",
      ky: "Бир жолку жеткирүү",
      en: "One-time delivery"
    },

    price_note: {
      ru: "Закрытая сделка",
      ky: "Жабылган бүтүм",
      en: "Closed transaction"
    },

    status_note: {
      ru: "ТОРГИ ЗАКРЫТЫ — ЛОТ ВЫКУПЛЕН",
      ky: "СООДА ЖАБЫК — ЛОТ САТЫЛДЫ",
      en: "TRADING CLOSED — LOT SOLD"
    },

    action_note: {
      ru: "ВЫКУПЛЕНО",
      ky: "САТЫЛДЫ",
      en: "SOLD"
    },

    price_unit: {
      ru: "сом / голову",
      ky: "сом / башка",
      en: "KGS / head"
    }
  },

  "TEST-001": {
    breed: {
      ru: "Ала-Тоо",
      ky: "Ала-Тоо",
      en: "Ala-Too"
    },

    region: {
      ru: "Ошская область",
      ky: "Ош облусу",
      en: "Osh Region"
    },

    feed_type: {
      ru: "Тестовый лот",
      ky: "Тесттик лот",
      en: "Test lot"
    },

    contract_label: {
      ru: "Разовая поставка",
      ky: "Бир жолку жеткирүү",
      en: "One-time delivery"
    },

    price_note: {
      ru: "Тестовые данные",
      ky: "Тесттик маалымат",
      en: "Test data"
    },

    status_note: {
      ru: "ЛОТ ЗАБРОНИРОВАН",
      ky: "ЛОТ БРОНДОЛГОН",
      en: "LOT RESERVED"
    },

    action_note: {
      ru: "ЛОТ ЗАБЛОКИРОВАН ДЛЯ ДРУГИХ УЧАСТНИКОВ",
      ky: "ЛОТ БАШКА КАТЫШУУЧУЛАР ҮЧҮН БӨГӨТТӨЛГӨН",
      en: "LOT BLOCKED FOR OTHER PARTICIPANTS"
    },

    price_unit: {
      ru: "сом / кг",
      ky: "сом / кг",
      en: "KGS / kg"
    }
  },

  "TEST-002": {
    breed: {
      ru: "Швицкая порода (Бычки)",
      ky: "Швиц тукуму (Букачалар)",
      en: "Simmental breed (Young bulls)"
    },

    region: {
      ru: "Ошская область",
      ky: "Ош облусу",
      en: "Osh Region"
    },

    feed_type: {
      ru: "Тестовый лот",
      ky: "Тесттик лот",
      en: "Test lot"
    },

    contract_label: {
      ru: "Разовая поставка",
      ky: "Бир жолку жеткирүү",
      en: "One-time delivery"
    },

    price_note: {
      ru: "Тестовые данные",
      ky: "Тесттик маалымат",
      en: "Test data"
    },

    status_note: {
      ru: "ОТКРЫТА ТОРГОВАЯ СЕССИЯ",
      ky: "СООДА СЕССИЯСЫ АЧЫК",
      en: "TRADING SESSION OPEN"
    },

    action_note: {
      ru: "",
      ky: "",
      en: ""
    },

    price_unit: {
      ru: "сом / кг",
      ky: "сом / кг",
      en: "KGS / kg"
    }
  }
};


/* =========================================================
   FILTERS
   ========================================================= */

const filterSearch = document.querySelector("#lot-search");
const filterType = document.querySelector("#lot-type");
const filterRegion = document.querySelector("#lot-region");
const filterStatus = document.querySelector("#lot-status");
const filterPriceMin = document.querySelector("#lot-price-min");
const filterPriceMax = document.querySelector("#lot-price-max");
const filterReset = document.querySelector("#lot-filters-reset");

function normalizedSearchValue(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase();
}

function translatedLotSearchText(lot) {
  return [
    lot.lot_number,
    getLotTranslation(lot, "breed"),
    getLotTranslation(lot, "region"),
    getLotTranslation(lot, "feed_type"),
    getLotTranslation(lot, "contract_label"),
    getLotTranslation(lot, "primary_metric_value"),
    getLotTranslation(lot, "secondary_metric_value"),
    getLotTranslation(lot, "tertiary_metric_value")
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function uniqueRegions() {
  const values = new Map();

  lots.forEach((lot) => {
    const rawRegion = String(lot.region ?? "").trim();
    if (!rawRegion) return;

    if (!values.has(rawRegion)) {
      values.set(
        rawRegion,
        getLotTranslation(lot, "region") || rawRegion
      );
    }
  });

  return [...values.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
}

function populateFilterOptions() {
  if (!filterType || !filterRegion || !filterStatus) return;

  const currentType = filters.type;
  const currentRegion = filters.region;
  const currentStatus = filters.status;

  filterType.replaceChildren();
  filterRegion.replaceChildren();
  filterStatus.replaceChildren();

  const allTypeOption = create(
    "option",
    "",
    t("filterAll")
  );
  allTypeOption.value = "";

  const allRegionOption = create(
    "option",
    "",
    t("filterAll")
  );
  allRegionOption.value = "";

  const allStatusOption = create(
    "option",
    "",
    t("filterAll")
  );
  allStatusOption.value = "";

  filterType.append(allTypeOption);
  filterRegion.append(allRegionOption);
  filterStatus.append(allStatusOption);

  const existingTypes = [
    ...new Set(
      lots
        .map((lot) => lot.animal_type)
        .filter((value) => Object.hasOwn(productKeys, value))
    )
  ];

  existingTypes.forEach((value) => {
    const option = create(
      "option",
      "",
      t(productKeys[value])
    );

    option.value = value;
    filterType.append(option);
  });

  uniqueRegions().forEach(({ value, label }) => {
    const option = create(
      "option",
      "",
      label
    );

    option.value = value;
    filterRegion.append(option);
  });

  Object.entries(statusKeys).forEach(([value, key]) => {
    const option = create(
      "option",
      "",
      t(key)
    );

    option.value = value;
    filterStatus.append(option);
  });

  filterType.value = currentType;
  filterRegion.value = currentRegion;
  filterStatus.value = currentStatus;
}

function applyFilters() {
  const search = normalizedSearchValue(filters.search);

  const minPrice =
    filters.minPrice === ""
      ? null
      : Number(filters.minPrice);

  const maxPrice =
    filters.maxPrice === ""
      ? null
      : Number(filters.maxPrice);

  filteredLots = lots.filter((lot) => {
    if (
      search &&
      !translatedLotSearchText(lot).includes(search)
    ) {
      return false;
    }

    if (
      filters.type &&
      lot.animal_type !== filters.type
    ) {
      return false;
    }

    if (
      filters.region &&
      String(lot.region ?? "") !== filters.region
    ) {
      return false;
    }

    if (
      filters.status &&
      lot.status !== filters.status
    ) {
      return false;
    }

    const price = Number(lot.price);

    if (
      minPrice !== null &&
      (!Number.isFinite(price) || price < minPrice)
    ) {
      return false;
    }

    if (
      maxPrice !== null &&
      (!Number.isFinite(price) || price > maxPrice)
    ) {
      return false;
    }

    return true;
  });

  renderFilteredLots();

  /* MINIMAL FIX: после успешной загрузки и рендера
     гасим индикатор "Загрузка…", иначе он висит
     поверх списка (state.hidden=true выставляется
     только в renderFilteredLots, чего недостаточно,
     когда состояние не loading и список отфильтрован). */
  if (loadStatus === "loaded" && filteredLots.length > 0) {
    state.hidden = true;
  }
}


/* =========================================================
   FILTERED LOTS RENDER
   ========================================================= */

function renderFilteredLots() {
  desktopLots.replaceChildren();
  cards.replaceChildren();

  if (!filteredLots.length) {
    desktopLots.hidden = true;
    cards.replaceChildren();

    setState(
      state,
      "loading",
      t("filterNoResults")
    );

    return;
  }

  state.hidden = true;
  desktopLots.hidden = false;

  filteredLots.forEach((lot) => {
    desktopLots.append(
      renderDesktopLot(lot)
    );

    renderMobileLot(lot);
  });
}


/* =========================================================
   MOBILE LOT
   ========================================================= */

function renderMobileLot(lot) {
  const card = create(
    "article",
    "lot-card"
  );

  const top = create(
    "div",
    "lot-card__top"
  );

  const heading = document.createElement("div");

  const id = create(
    "span",
    "lot-number",
    `${t("lotId")} №${lot.lot_number}`
  );

  if (lot.is_demo) {
    id.append(
      create(
        "span",
        "demo-tag",
        "DEMO"
      )
    );
  }

  heading.append(
    id,

    create(
      "h3",
      "lot-card__title",
      lotTitle(lot)
    )
  );

  top.append(
    heading,
    statusNode(lot)
  );

  const media = create(
    "div",
    "lot-card__media"
  );

  const mediaBox = create(
    "div",
    "lot-card__media-placeholder"
  );

  if (lot.image_signed_url) {
  const img = document.createElement("img");

  img.src = lot.image_signed_url;
  img.alt = lotTitle(lot);
  img.loading = "eager";
  img.decoding = "async";
  img.className = "lot-card__media-image";

  /* Если фото не пришло — показываем плейсхолдер. */
  img.addEventListener("error", () => {
    mediaBox.append(
      create(
        "strong",
        "",
        t(productKeys[lot.animal_type])
      ),
      create(
        "span",
        "",
        t("lotMediaPlaceholder")
      )
    );
    img.remove();
  });

  mediaBox.append(img);
} else {
  mediaBox.append(
    create(
      "strong",
      "",
      t(productKeys[lot.animal_type])
    ),

    create(
      "span",
      "",
      t("lotMediaPlaceholder")
    )
  );
}

  media.append(mediaBox);

  const grid = create(
    "div",
    "lot-card__grid"
  );

  metricPairs(lot).forEach(
    ([label, value]) => {
      const pair = create(
        "div",
        "data-pair"
      );

      pair.append(
        create(
          "span",
          "",
          label
        ),

        create(
          "strong",
          "",
          value
        )
      );

      grid.append(pair);
    }
  );

  card.append(
    top,
    media,
    grid,
    actionButtons(lot)
  );

  cards.append(card);
}


/* =========================================================
   FILTER INPUTS
   ========================================================= */

function syncFilterInputs() {
  if (filterSearch) filterSearch.value = filters.search;
  if (filterType) filterType.value = filters.type;
  if (filterRegion) filterRegion.value = filters.region;
  if (filterStatus) filterStatus.value = filters.status;
  if (filterPriceMin) filterPriceMin.value = filters.minPrice;
  if (filterPriceMax) filterPriceMax.value = filters.maxPrice;
}

function resetFilters() {
  filters.search = "";
  filters.type = "";
  filters.region = "";
  filters.status = "";
  filters.minPrice = "";
  filters.maxPrice = "";

  syncFilterInputs();
  applyFilters();
}

function initFilters() {
  if (
    !filterSearch ||
    !filterType ||
    !filterRegion ||
    !filterStatus ||
    !filterPriceMin ||
    !filterPriceMax ||
    !filterReset
  ) {
    return;
  }

  filterSearch.addEventListener("input", () => {
    filters.search = filterSearch.value;
    applyFilters();
  });

  filterType.addEventListener("change", () => {
    filters.type = filterType.value;
    applyFilters();
  });

  filterRegion.addEventListener("change", () => {
    filters.region = filterRegion.value;
    applyFilters();
  });

  filterStatus.addEventListener("change", () => {
    filters.status = filterStatus.value;
    applyFilters();
  });

  filterPriceMin.addEventListener("input", () => {
    filters.minPrice = filterPriceMin.value;
    applyFilters();
  });

  filterPriceMax.addEventListener("input", () => {
    filters.maxPrice = filterPriceMax.value;
    applyFilters();
  });

  filterReset.addEventListener(
    "click",
    resetFilters
  );
}


/* =========================================================
   DOM
   ========================================================= */

const state = document.querySelector("#lots-state");
const desktopLots = document.querySelector("#desktop-lots-list");
const cards = document.querySelector("#lot-cards");
const modal = document.querySelector("#booking-modal");
const form = document.querySelector("#booking-form");
const submit = document.querySelector("#booking-submit");
const formView = document.querySelector("#booking-form-view");
const successView = document.querySelector("#booking-success-view");
const errorBox = document.querySelector("#booking-error");
const summary = document.querySelector("#booking-summary");
const successBox = document.querySelector("#booking-success");
const phoneInput = document.querySelector("#booking-phone");
const bookingInn = document.querySelector("#booking-inn");


/* =========================================================
   DESKTOP LOT
   ========================================================= */

function renderDesktopLot(lot) {
  const card = create(
    "article",
    "desktop-lot"
  );

  /* MEDIA */

  const media = create(
    "div",
    "desktop-lot__media"
  );

  const image = create(
    "div",
    "desktop-lot__image"
  );

if (lot.image_signed_url) {
  const img = document.createElement("img");

  img.src = lot.image_signed_url;
  img.alt = lotTitle(lot);
  img.loading = "eager";
  img.decoding = "async";

  /* Если фото не пришло — показываем плейсхолдер,
     а не пустую коробку. */
  img.addEventListener("error", () => {
    image.append(
      create(
        "div",
        "desktop-lot__image-product",
        t(productKeys[lot.animal_type])
      )
    );
    img.remove();
  });

  image.append(img);
} else {
  const product = create(
    "div",
    "desktop-lot__image-product",
    t(productKeys[lot.animal_type])
  );

  image.append(product);
}

media.append(image);


  /* MAIN */

  const main = create(
    "div",
    "desktop-lot__main"
  );

  const top = create(
    "div",
    "desktop-lot__top"
  );

  const lotId = create(
    "div",
    "desktop-lot__id",
    `#${lot.lot_number}`
  );

  if (lot.is_demo) {
    lotId.append(
      create(
        "span",
        "demo-tag",
        "DEMO"
      )
    );
  }

  const title = create(
    "h3",
    "desktop-lot__title",
    lotTitle(lot)
  );

  top.append(
    lotId,
    title
  );

  const details = create(
    "div",
    "desktop-lot__details"
  );

  details.append(
    create(
      "span",
      "",
      quantityLabel(lot.quantity)
    ),

    create(
      "span",
      "",
      getLotTranslation(
        lot,
        "region"
      )
    )
  );

  const extra = getLotTranslation(
    lot,
    "contract_label"
  );

  if (extra) {
    details.append(
      create(
        "span",
        "",
        extra
      )
    );
  }

  main.append(
    top,
    details
  );


  /* RIGHT SIDE */

  const side = create(
    "div",
    "desktop-lot__side"
  );

  side.append(
  (() => {
    const priceWrap = create(
      "div",
      "desktop-lot__price-wrap"
    );

    priceWrap.append(
      create(
        "div",
        "desktop-lot__price",
        priceLabel(lot)
      )
    );

    const note =
      getLotTranslation(
        lot,
        "price_note"
      ) ||
      lot.price_note ||
      "";

    if (note) {
      priceWrap.append(
        create(
          "div",
          "desktop-lot__price-note",
          note
        )
      );
    }

    return priceWrap;
  })(),

  statusNode(lot)
);

  const actions = actionButtons(lot);

  actions.classList.add(
    "desktop-lot__actions"
  );

  card.append(
    media,
    main,
    side,
    actions
  );

  return card;
}


/* =========================================================
   LOCALIZED LOT HELPERS
   ========================================================= */

function getLotTranslation(lot, field) {
  const lotNumber = String(
    lot?.lot_number ?? ""
  );

  const lang = language();

  /* Новые коды регионов из админ-панели */
  if (field === "region") {
    const regionKeys = {
      batken: "regionBatken",
      jalal_abad: "regionJalalAbad",
      issyk_kul: "regionIssykKul",
      naryn: "regionNaryn",
      osh: "regionOsh",
      talas: "regionTalas",
      chuy: "regionChuy"
    };

    const regionCode =
      String(lot?.region ?? "")
        .trim()
        .toLowerCase();

    const regionKey =
      regionKeys[regionCode];

    if (regionKey) {
      return t(regionKey);
    }
  }

  /* Старые лоты работают как раньше */
  return (
    lotTranslations[lotNumber]?.[field]?.[lang] ??
    lotTranslations[lotNumber]?.[field]?.ru ??
    lot?.[field] ??
    ""
  );
}

function lotTitle(lot) {
  const animalType = t(
    productKeys[lot.animal_type]
  );

  const breed = getLotTranslation(
    lot,
    "breed"
  );

  return `${animalType} • ${breed}`;
}

function statusText(lot) {
  const translatedStatusNote =
    getLotTranslation(
      lot,
      "status_note"
    );

  return (
    translatedStatusNote ||
    t(statusKeys[lot.status])
  );
}

function statusNode(lot) {
  return create(
    "span",
    `status status--${lot.status}`,
    statusText(lot)
  );
}

function quantityLabel(value) {
  return `${formatNumber(value)} ${t("headsUnit")}`;
}

function priceLabel(lot) {
  const priceUnit =
    getLotTranslation(
      lot,
      "price_unit"
    ) ||
    lot.price_unit ||
    "";

  return `${formatNumber(lot.price)} ${priceUnit}`;
}

function priceDisplayLabel(lot) {
  const price = priceLabel(lot);

  const priceNote =
    getLotTranslation(
      lot,
      "price_note"
    ) ||
    lot.price_note ||
    "";

  return priceNote
    ? `${price} · ${priceNote}`
    : price;
}

function whatsappMessage(lot) {
  const values = {
    ru: `Здравствуйте! Хочу уточнить информацию по лоту №${lot.lot_number} на сайте AgroMal.`,
    ky: `Саламатсызбы! AgroMal сайтындагы №${lot.lot_number} лот боюнча маалымат тактагым келет.`,
    en: `Hello! I would like to clarify information about lot No. ${lot.lot_number} on the AgroMal website.`
  };

  return values[language()] || values.ru;
}


/* =========================================================
   BOOKING SERVICE
   ========================================================= */

function appsScriptUrl() {
  return String(
    window.AGROMAL_CONFIG?.bookingAppsScriptUrl || ""
  ).trim();
}

function isAppsScriptConfigured() {
  try {
    const url = new URL(
      appsScriptUrl()
    );

    return (
      url.protocol === "https:" &&
      /script\.google(?:usercontent)?\.com$/i.test(
        url.hostname
      )
    );
  } catch {
    return false;
  }
}

function extractMessage(
  payload,
  fallback = ""
) {
  if (!payload) return fallback;

  if (typeof payload === "string") {
    return (
      payload.trim() ||
      fallback
    );
  }

  if (
    typeof payload.message === "string" &&
    payload.message.trim()
  ) {
    return payload.message.trim();
  }

  if (
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error.trim();
  }

  if (
    typeof payload.detail === "string" &&
    payload.detail.trim()
  ) {
    return payload.detail.trim();
  }

  if (payload.data) {
    return extractMessage(
      payload.data,
      fallback
    );
  }

  return fallback;
}

function extractBookingNumber(
  payload,
  rawText = ""
) {
  if (
    payload &&
    typeof payload === "object"
  ) {
    const data =
      payload.data &&
      typeof payload.data === "object"
        ? payload.data
        : payload;

    const value =
      data.bookingNumber ||
      data.booking_number ||
      data.requestNumber ||
      data.request_number ||
      data.number ||
      payload.bookingNumber ||
      payload.booking_number;

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  const match = String(
    rawText || ""
  ).match(/AG-\d{3,}/i);

  return match
    ? match[0].toUpperCase()
    : "";
}

async function submitBookingToAppsScript(
  lot,
  formData
) {
  if (!isAppsScriptConfigured()) {
    const error = new Error(
      "BOOKING_ENDPOINT_NOT_CONFIGURED"
    );

    error.uiMessage = t(
      "bookingConfigMissing"
    );

    throw error;
  }

  const payload = {
    lotNumber:
      lot.lot_number,

    lotTitle:
      lotTitle(lot),

    price:
      lot.price,

    priceUnit:
      getLotTranslation(
        lot,
        "price_unit"
      ) ||
      lot.price_unit,

    quantity:
      lot.quantity,

    customerName:
      formData.customerName,

    customerPhone:
      formData.customerPhone,

    organization:
      currentBuyer.companyName || "",

    inn:
      currentBuyer.inn || "",

    login:
      currentBuyer.loginEmail || "",

    comment:
      formData.comment || ""
  };

  let response;

  try {
    response = await fetch(
      appsScriptUrl(),
      {
        method: "POST",
        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "text/plain;charset=utf-8"
        },
        body:
          JSON.stringify(payload),
        cache: "no-store"
      }
    );
  } catch (error) {
    const networkError = new Error(
      "BOOKING_ENDPOINT_UNREACHABLE"
    );

    networkError.uiMessage = t(
      "bookingServiceUnavailable"
    );

    networkError.cause = error;

    throw networkError;
  }

  const rawText =
    await response.text();

  let parsed = null;

  if (rawText) {
    try {
      parsed =
        JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  if (!response.ok) {
    const requestError =
      new Error(
        "BOOKING_ENDPOINT_ERROR"
      );

    requestError.uiMessage =
      extractMessage(
        parsed,
        t("bookingServerError")
      );

    requestError.status =
      response.status;

    throw requestError;
  }

  const successFlag =
    typeof parsed ===
      "object" &&
    parsed !== null
      ? (
          typeof parsed.ok ===
          "boolean"
            ? parsed.ok
            : typeof parsed.success ===
                "boolean"
              ? parsed.success
              : typeof parsed.status ===
                  "string"
                ? [
                    "success",
                    "ok"
                  ].includes(
                    parsed.status.toLowerCase()
                  )
                : typeof parsed.result ===
                    "string"
                  ? [
                      "success",
                      "ok"
                    ].includes(
                      parsed.result.toLowerCase()
                    )
                  : true
        )
      : true;

  const bookingNumber =
    extractBookingNumber(
      parsed,
      rawText
    );

  if (
    successFlag === false
  ) {
    const requestError =
      new Error(
        "BOOKING_REJECTED"
      );

    requestError.uiMessage =
      extractMessage(
        parsed,
        t("bookingServerError")
      );

    throw requestError;
  }

  if (!bookingNumber) {
    const requestError =
      new Error(
        "BOOKING_INVALID_RESPONSE"
      );

    requestError.uiMessage = t(
      "bookingInvalidResponse"
    );

    throw requestError;
  }

  return {
    booking_number:
      bookingNumber,

    lot_number:
      lot.lot_number
  };
}


/* =========================================================
   LOT METRICS
   ========================================================= */

function localizedOptionalField(
  lot,
  labelField,
  valueField
) {
  const label =
    getLotTranslation(
      lot,
      labelField
    );

  const value =
    getLotTranslation(
      lot,
      valueField
    );

  if (!label || !value) {
    return null;
  }

  return [
    label,
    value
  ];
}

function metricPairs(lot) {
  const pairs = [
    [
      t("quantity"),
      quantityLabel(
        lot.quantity
      )
    ]
  ];

  if (lot.weight_kg) {
    pairs.push([
      t("weightTotal"),

      `${formatNumber(
        lot.weight_kg
      )} ${t("kgUnit")}`
    ]);
  }

  const primary =
    localizedOptionalField(
      lot,
      "primary_metric_label",
      "primary_metric_value"
    );

  if (primary) {
    pairs.push(primary);
  }

  pairs.push([
    t("region"),
    getLotTranslation(
      lot,
      "region"
    )
  ]);

  const feedType =
    getLotTranslation(
      lot,
      "feed_type"
    );

  if (feedType) {
    pairs.push([
      t("feed"),
      feedType
    ]);
  }

  const secondary =
    localizedOptionalField(
      lot,
      "secondary_metric_label",
      "secondary_metric_value"
    );

  if (secondary) {
    pairs.push(secondary);
  }

  const contractLabel =
    getLotTranslation(
      lot,
      "contract_label"
    ) ||
    t(
      lot.contract_type ===
        "forward"
        ? "forwardContractLabel"
        : "spotContractLabel"
    );

  pairs.push([
    t("contract"),
    contractLabel
  ]);

  const tertiary =
    localizedOptionalField(
      lot,
      "tertiary_metric_label",
      "tertiary_metric_value"
    );

  if (tertiary) {
    pairs.push(tertiary);
  }

  pairs.push([
    t("price"),
    priceDisplayLabel(lot)
  ]);

  return pairs;
}


/* =========================================================
   DISABLED ACTION
   ========================================================= */

function disabledActionLabel(lot) {
  const translatedActionNote =
    getLotTranslation(
      lot,
      "action_note"
    );

  if (translatedActionNote) {
    return translatedActionNote;
  }

  if (lot.status === "reserved") {
    return t(
      "lotReservedByCounterparty"
    );
  }

  if (lot.status === "sold") {
    return t(
      "lotSoldDisabled"
    );
  }

  return t(
    "lotClosedDisabled"
  );
}


/* =========================================================
   ACTION BUTTONS
   ========================================================= */

function actionButtons(lot) {
  const wrap = create(
    "div",
    "lot-actions"
  );

  const primary = create(
    "button",
    "button button--small",
    lot.status === "available"
      ? t("bookLot")
      : disabledActionLabel(lot)
  );

  primary.type =
    "button";

  if (
    lot.status ===
    "available"
  ) {
    primary.addEventListener(
      "click",
      () => openBookingModal(lot)
    );
  } else {
    primary.disabled = true;
  }

  const whatsapp = create(
    "a",
    "button button--ghost button--small",
    t("whatsapp")
  );

  setWhatsappLink(
    whatsapp,
    window.AGROMAL_CONFIG
      ?.whatsappModeration,
    whatsappMessage(lot)
  );

  wrap.append(
    primary,
    whatsapp
  );

  return wrap;
}


/* =========================================================
   UI HELPERS
   ========================================================= */

function renderError() {
  desktopLots.hidden =
    true;

  cards.replaceChildren();

  setState(
    state,
    "error",
    t("loadError")
  );

  const retry =
    create(
      "button",
      "button button--ghost button--small",
      t("retry")
    );

  retry.type = "button";

  retry.addEventListener(
    "click",
    loadLots,
    { once: true }
  );

  state.append(
    document.createElement("br"),
    retry
  );
}


/* =========================================================
   BOOKING SUMMARY
   ========================================================= */

function renderSummary(
  target,
  lot
) {
  target.replaceChildren();

  const header =
    create(
      "div",
      "booking-summary__header"
    );

  header.append(
    create(
      "span",
      "lot-number",
      `${t("lotId")} №${lot.lot_number}`
    ),

    create(
      "h3",
      "booking-summary__title",
      lotTitle(lot)
    )
  );

  const grid =
    create(
      "div",
      "booking-summary__grid"
    );

  const values = [
    [
      t("price"),
      priceDisplayLabel(lot)
    ],

    [
      t("quantity"),
      quantityLabel(
        lot.quantity
      )
    ]
  ];

  values.forEach(
    ([label, value]) => {
      const pair =
        create(
          "div",
          "data-pair"
        );

      pair.append(
        create(
          "span",
          "",
          label
        ),

        create(
          "strong",
          "",
          value
        )
      );

      grid.append(pair);
    }
  );

  target.append(
    header,
    grid
  );
}


/* =========================================================
   BOOKING SUCCESS
   ========================================================= */

function renderSuccess(
  result,
  lot
) {
  successBox.replaceChildren();

  const numberLine =
    create(
      "div",
      "booking-success__number",
      `${t("bookingNumberInline")} №${result.booking_number}`
    );

  const text =
    create(
      "p",
      "",
      t("bookingAcceptedText")
    );

  const meta =
    create(
      "div",
      "booking-success__meta"
    );

  meta.append(
    create(
      "strong",
      "",
      `${t("lotId")} #${result.lot_number}`
    ),

    create(
      "span",
      "",
      lotTitle(lot)
    )
  );

  successBox.append(
    numberLine,
    text,
    meta
  );
}


/* =========================================================
   BOOKING MODAL
   ========================================================= */

function openBookingModal(lot) {
  currentLot = lot;

  form.reset();

  document.querySelector(
    "#booking-name"
  ).value = "";

  bookingInn.value =
    currentBuyer.inn;

  formView.hidden =
    false;

  successView.hidden =
    true;

  setState(
    errorBox,
    "error",
    ""
  );

  submit.disabled =
    false;

  submit.textContent =
    t("bookingConfirm");

  renderSummary(
    summary,
    lot
  );

  modal.hidden =
    false;

  document.body.classList.add(
    "modal-open"
  );

  document.querySelector(
    "#booking-name"
  ).focus();
}

function closeBookingModal() {
  modal.hidden =
    true;

  document.body.classList.remove(
    "modal-open"
  );

  currentLot = null;
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {
  desktopLots.replaceChildren();
  cards.replaceChildren();

  if (
    loadStatus ===
    "error"
  ) {
    renderError();
    return;
  }

  if (!lots.length) {
    desktopLots.hidden =
      true;

    setState(
      state,
      "loading",
      t("emptyLots")
    );

    return;
  }

  populateFilterOptions();
  applyFilters();
}


/* =========================================================
   LOAD LOTS
   ========================================================= */

async function loadLots() {
  loadStatus =
    "loading";

  setState(
    state,
    "loading",
    t("loading")
  );

  desktopLots.hidden =
    true;

  try {
    lots = await db(
      "lots",
      {
        query:
          "?select=id,lot_number,animal_type,breed,region,quantity,weight_kg,feed_type,contract_type,contract_label,price,price_unit,price_note,primary_metric_label,primary_metric_value,secondary_metric_label,secondary_metric_value,tertiary_metric_label,tertiary_metric_value,status,status_note,action_note,is_demo,image_url&order=created_at.asc"
      }
    );
    lots = await Promise.all(
  lots.map(async (lot) => {
    if (!lot.image_url) {
      return lot;
    }

    try {
      return {
        ...lot,
        image_signed_url:
          await createLotImageSignedUrl(
            lot.image_url,
            3600
          )
      };
    } catch (error) {
      console.warn(
        "AGROMAL lot image URL failed:",
        lot.id,
        error
      );

      return lot;
    }
  })
);
    loadStatus =
      "loaded";

    render();
  } catch (error) {
    console.error(
      "AGROMAL lots load failed",
      error
    );

    loadStatus =
      "error";

    renderError();
  }
}


/* =========================================================
   BOOKING ERROR
   ========================================================= */

function bookingErrorMessage(
  error
) {
  if (error?.uiMessage) {
    return error.uiMessage;
  }

  return t(
    "bookingError"
  );
}


/* =========================================================
   PHONE INPUT
   ========================================================= */

phoneInput.addEventListener(
  "input",
  () => {
    phoneInput.value =
      phoneInput.value
        .replace(
          /[^\d+()\-\s]/g,
          ""
        )
        .slice(
          0,
          32
        );
  }
);


/* =========================================================
   BOOKING FORM
   ========================================================= */

form.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!currentLot) {
      return;
    }

    const customerName =
      document.querySelector(
        "#booking-name"
      ).value.trim();

    const customerPhone =
      phoneInput.value.trim();

    const comment =
      document.querySelector(
        "#booking-comment"
      ).value.trim();

    if (
      customerName.length < 2 ||
      customerPhone.length < 6
    ) {
      setState(
        errorBox,
        "error",
        t("formError")
      );

      return;
    }

    submit.disabled =
      true;

    submit.textContent =
      t("bookingSending");

    setState(
      errorBox,
      "error",
      ""
    );

    try {
      const result =
        await submitBookingToAppsScript(
          currentLot,
          {
            customerName,
            customerPhone,
            comment
          }
        );

      renderSuccess(
        result,
        currentLot
      );

      formView.hidden =
        true;

      successView.hidden =
        false;
    } catch (error) {
      console.error(
        "AGROMAL booking submit failed",
        error
      );

      setState(
        errorBox,
        "error",
        bookingErrorMessage(error)
      );
    } finally {
      submit.disabled =
        false;

      submit.textContent =
        t("bookingConfirm");
    }
  }
);


/* =========================================================
   MODAL EVENTS
   ========================================================= */

modal.addEventListener(
  "click",
  (event) => {
    if (
      event.target.hasAttribute(
        "data-modal-close"
      )
    ) {
      closeBookingModal();
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      !modal.hidden
    ) {
      closeBookingModal();
    }
  }
);


/* =========================================================
   START
   ========================================================= */

async function start() {
  const result =
    await requireAccess();

  if (
    redirectForAccess(result)
  ) {
    return;
  }

  currentBuyer = {
    fullName:
      result.access.full_name ||
      "",

    companyName:
      result.access.company_name ||
      "",

    loginEmail:
      result.user?.email ||
      "",

    inn:
      result.access.inn ||
      ""
  };

  document.querySelector(
    "#user-meta"
  ).textContent =
    `${result.access.full_name} · ${result.access.company_name}`;

  document.querySelector(
    "#admin-link"
  ).hidden =
    result.access.role !==
    "admin";

  initFilters();

  document.addEventListener(
    "agromal:language",
    () => {
      populateFilterOptions();
      syncFilterInputs();
      render();
    }
  );

  await loadLots();
}

start();