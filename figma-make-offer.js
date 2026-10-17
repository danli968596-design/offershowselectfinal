(function () {
  const STORAGE_KEY = "figmaMakeOffers";

  const state = {
    offers: loadOffers(),
    selectedOfferIds: [],
    editingId: null,
    benefits: [],
  };

  const els = {
    addBtn: document.getElementById("mkAddBtn"),
    addFirstBtn: document.getElementById("mkAddFirstBtn"),
    compareBtn: document.getElementById("mkCompareBtn"),
    empty: document.getElementById("mkEmpty"),
    list: document.getElementById("mkList"),
    formModal: document.getElementById("mkFormModal"),
    compareModal: document.getElementById("mkCompareModal"),
    formTitle: document.getElementById("mkFormTitle"),
    form: document.getElementById("mkForm"),
    closeFormBtn: document.getElementById("mkCloseFormBtn"),
    cancelBtn: document.getElementById("mkCancelBtn"),
    closeCompareBtn: document.getElementById("mkCloseCompareBtn"),
    compareTitle: document.getElementById("mkCompareTitle"),
    compareList: document.getElementById("mkCompareList"),
    company: document.getElementById("mkCompany"),
    position: document.getElementById("mkPosition"),
    salary: document.getElementById("mkSalary"),
    location: document.getElementById("mkLocation"),
    startDate: document.getElementById("mkStartDate"),
    benefitInput: document.getElementById("mkBenefitInput"),
    addBenefitBtn: document.getElementById("mkAddBenefitBtn"),
    benefits: document.getElementById("mkBenefits"),
    pros: document.getElementById("mkPros"),
    cons: document.getElementById("mkCons"),
    rating: document.getElementById("mkRating"),
  };

  bindEvents();
  render();

  function bindEvents() {
    els.addBtn.addEventListener("click", openCreateForm);
    els.addFirstBtn.addEventListener("click", openCreateForm);
    els.compareBtn.addEventListener("click", openCompareModal);
    els.closeFormBtn.addEventListener("click", closeFormModal);
    els.cancelBtn.addEventListener("click", closeFormModal);
    els.closeCompareBtn.addEventListener("click", closeCompareModal);
    els.addBenefitBtn.addEventListener("click", handleAddBenefit);
    els.form.addEventListener("submit", handleFormSubmit);

    els.benefitInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddBenefit();
      }
    });

    els.list.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const actionBtn = target.closest("[data-action]");
      if (!actionBtn) return;
      const action = actionBtn.getAttribute("data-action");
      const id = actionBtn.getAttribute("data-id");
      if (!id) return;

      if (action === "edit") {
        openEditForm(id);
      } else if (action === "delete") {
        deleteOffer(id);
      }
    });

    els.list.addEventListener("change", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.matches("[data-role='compare-toggle']")) {
        toggleCompare(target.value, target.checked);
      }
    });

    els.formModal.addEventListener("click", function (event) {
      if (event.target === els.formModal) closeFormModal();
    });
    els.compareModal.addEventListener("click", function (event) {
      if (event.target === els.compareModal) closeCompareModal();
    });
  }

  function loadOffers() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function persistOffers() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.offers));
  }

  function render() {
    renderList();
    renderCompareButton();
  }

  function renderList() {
    if (state.offers.length === 0) {
      els.empty.hidden = false;
      els.list.hidden = true;
      els.list.innerHTML = "";
      return;
    }

    els.empty.hidden = true;
    els.list.hidden = false;
    els.list.innerHTML = state.offers
      .map(function (offer) {
        const checked = state.selectedOfferIds.includes(offer.id) ? "checked" : "";
        return (
          '<article class="mk-card-wrap">' +
          '<label class="mk-compare-toggle">' +
          '<input type="checkbox" data-role="compare-toggle" value="' + escapeHtml(offer.id) + '" ' + checked + ">" +
          "<span>选择对比</span>" +
          "</label>" +
          '<div class="mk-card">' +
          '<div class="mk-card__head">' +
          "<div>" +
          "<h3>" + escapeHtml(offer.company) + "</h3>" +
          "<p>" + escapeHtml(offer.position) + "</p>" +
          "</div>" +
          '<div class="mk-mini-actions">' +
          '<button type="button" data-action="edit" data-id="' + escapeHtml(offer.id) + '">✎</button>' +
          '<button type="button" data-action="delete" data-id="' + escapeHtml(offer.id) + '">🗑</button>' +
          "</div>" +
          "</div>" +
          '<div class="mk-line">💰 <strong>¥' + Number(offer.salary || 0).toLocaleString("zh-CN") + '</strong>/年</div>' +
          '<div class="mk-line">📍 <span>' + escapeHtml(offer.location || "") + "</span></div>" +
          '<div class="mk-line">📅 <span>入职时间：' + escapeHtml(offer.startDate || "") + "</span></div>" +
          renderBenefits(offer.benefits) +
          renderOptionalNote("优势", offer.pros) +
          renderOptionalNote("劣势", offer.cons) +
          renderStars(offer.rating) +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderBenefits(benefits) {
    if (!Array.isArray(benefits) || benefits.length === 0) return "";
    return (
      '<div class="mk-tags">' +
      benefits.map(function (item) { return '<span class="mk-tag">' + escapeHtml(item) + "</span>"; }).join("") +
      "</div>"
    );
  }

  function renderOptionalNote(title, content) {
    if (!content) return "";
    return '<div class="mk-note"><strong>' + title + "：</strong><p>" + escapeHtml(content) + "</p></div>";
  }

  function renderStars(rating) {
    if (!rating || rating <= 0) return "";
    const stars = Array.from({ length: 5 }, function (_, idx) {
      return idx + 1 <= rating ? '<span class="mk-star">★</span>' : "☆";
    }).join("");
    return '<div class="mk-note"><strong>综合评分：</strong><p>' + stars + "</p></div>";
  }

  function renderCompareButton() {
    const count = state.selectedOfferIds.length;
    els.compareBtn.textContent = "对比选择（" + count + "）";
    els.compareBtn.disabled = count < 2;
  }

  function openCreateForm() {
    state.editingId = null;
    state.benefits = [];
    els.formTitle.textContent = "添加新Offer";
    els.form.reset();
    els.rating.value = "0";
    renderBenefitEditor();
    openFormModal();
  }

  function openEditForm(id) {
    const offer = state.offers.find(function (item) { return item.id === id; });
    if (!offer) return;
    state.editingId = id;
    state.benefits = Array.isArray(offer.benefits) ? offer.benefits.slice() : [];
    els.formTitle.textContent = "编辑Offer";
    els.company.value = offer.company || "";
    els.position.value = offer.position || "";
    els.salary.value = String(offer.salary || "");
    els.location.value = offer.location || "";
    els.startDate.value = offer.startDate || "";
    els.pros.value = offer.pros || "";
    els.cons.value = offer.cons || "";
    els.rating.value = String(offer.rating || 0);
    els.benefitInput.value = "";
    renderBenefitEditor();
    openFormModal();
  }

  function openFormModal() {
    els.formModal.classList.add("is-open");
    els.formModal.setAttribute("aria-hidden", "false");
  }

  function closeFormModal() {
    els.formModal.classList.remove("is-open");
    els.formModal.setAttribute("aria-hidden", "true");
  }

  function handleAddBenefit() {
    const value = els.benefitInput.value.trim();
    if (!value) return;
    state.benefits.push(value);
    els.benefitInput.value = "";
    renderBenefitEditor();
  }

  function renderBenefitEditor() {
    els.benefits.innerHTML = state.benefits
      .map(function (item, idx) {
        return '<button class="mk-tag" type="button" data-benefit-index="' + idx + '">' + escapeHtml(item) + " ×</button>";
      })
      .join("");

    els.benefits.querySelectorAll("[data-benefit-index]").forEach(function (node) {
      node.addEventListener("click", function () {
        const idx = Number(node.getAttribute("data-benefit-index"));
        state.benefits = state.benefits.filter(function (_, i) { return i !== idx; });
        renderBenefitEditor();
      });
    });
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const offer = {
      id: state.editingId || String(Date.now()),
      company: els.company.value.trim(),
      position: els.position.value.trim(),
      salary: Number(els.salary.value),
      location: els.location.value.trim(),
      startDate: els.startDate.value,
      benefits: state.benefits.slice(),
      pros: els.pros.value.trim(),
      cons: els.cons.value.trim(),
      rating: Number(els.rating.value) || 0,
    };

    if (state.editingId) {
      state.offers = state.offers.map(function (item) {
        return item.id === state.editingId ? offer : item;
      });
    } else {
      state.offers.push(offer);
    }

    persistOffers();
    closeFormModal();
    render();
  }

  function deleteOffer(id) {
    state.offers = state.offers.filter(function (item) { return item.id !== id; });
    state.selectedOfferIds = state.selectedOfferIds.filter(function (offerId) { return offerId !== id; });
    persistOffers();
    render();
  }

  function toggleCompare(id, checked) {
    if (checked) {
      if (!state.selectedOfferIds.includes(id)) {
        state.selectedOfferIds.push(id);
      }
    } else {
      state.selectedOfferIds = state.selectedOfferIds.filter(function (item) { return item !== id; });
    }
    renderCompareButton();
  }

  function openCompareModal() {
    if (state.selectedOfferIds.length < 2) return;
    const selected = state.offers.filter(function (offer) {
      return state.selectedOfferIds.includes(offer.id);
    });
    els.compareTitle.textContent = "Offer 对比（已选择 " + selected.length + " 个）";
    els.compareList.innerHTML = selected
      .map(function (offer) {
        return (
          '<article class="mk-card">' +
          '<div class="mk-card__head"><div><h3>' + escapeHtml(offer.company) + "</h3><p>" + escapeHtml(offer.position) + "</p></div></div>" +
          '<div class="mk-line">💰 <strong>¥' + Number(offer.salary || 0).toLocaleString("zh-CN") + '</strong>/年</div>' +
          '<div class="mk-line">📍 <span>' + escapeHtml(offer.location || "") + "</span></div>" +
          '<div class="mk-line">📅 <span>入职时间：' + escapeHtml(offer.startDate || "") + "</span></div>" +
          renderBenefits(offer.benefits) +
          renderOptionalNote("优势", offer.pros) +
          renderOptionalNote("劣势", offer.cons) +
          renderStars(offer.rating) +
          "</article>"
        );
      })
      .join("");
    els.compareModal.classList.add("is-open");
    els.compareModal.setAttribute("aria-hidden", "false");
  }

  function closeCompareModal() {
    els.compareModal.classList.remove("is-open");
    els.compareModal.setAttribute("aria-hidden", "true");
  }

  function escapeHtml(input) {
    const text = String(input || "");
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
