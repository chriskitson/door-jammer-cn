if (!customElements.get('sticky-atc-bar')) {
  customElements.define(
    'sticky-atc-bar',
    class StickyAtcBar extends HTMLElement {
      constructor() {
        super();
        document.body.classList.add('sticky-atc-bar-enabled');

        this.selectors = {
          variantIdSelect: '[name="id"]',
        };
      }

      connectedCallback() {
        this.productFormActions = document.querySelector('.main-product-form');
        this.mainProductInfo = document.querySelector('.product__info-container');
        this.mainVariantSelects = this.mainProductInfo && this.mainProductInfo.querySelector('variant-selects');
        this.container = this.closest('.sticky-atc-bar');

        this.variantData = this.getVariantData();

        this.init();
        this.addEventListener('change', () => {
          const selectedVariantId = this.querySelector(this.selectors.variantIdSelect).value;
          this.currentVariant = this.variantData.find((variant) => variant.id === Number(selectedVariantId));

          if (this.mainVariantSelects) {
            Array.from(this.mainVariantSelects.querySelectorAll('select, fieldset'), (element, index) => {
              const variantOptionVal = this.currentVariant.options[index];

              switch (element.tagName) {
                case 'SELECT':
                  element.value = variantOptionVal;
                  break;
                case 'FIELDSET':
                  Array.from(element.querySelectorAll('input')).forEach((radio) => {
                    if (radio.value === variantOptionVal) {
                      radio.checked = true;
                    }
                  });
                  break;
              }
            });
            this.mainVariantSelects.dispatchEvent(new Event('change'));
          }

          this.updatePrice();
          this.updateButton(true, '', false);
          if (!this.currentVariant) {
            this.updateButton(true, '', true);
          } else {
            this.updateButton(!this.currentVariant.available, FoxTheme.variantStrings.soldOut);
          }
        });
      }

      getVariantData() {
        this.variantData =
          this.variantData || JSON.parse(this.container.querySelector('[type="application/json"]').textContent);
        return this.variantData;
      }

      init() {
        if (!this.productFormActions) {
          this.container.classList.add('sticky-atc-bar--show');
          return;
        }
        this.productId = this.dataset.productId;

        const mql = window.matchMedia(FoxTheme.config.mediaQueryMobile);
        mql.onchange = this.checkDevice.bind(this);
        this.checkDevice();

        const rootMargin = `-80px 0px 0px 0px`;
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const method = entry.intersectionRatio !== 1 ? 'add' : 'remove';
              this.container.classList[method]('sticky-atc-bar--show');
            });
          },
          { threshold: 1, rootMargin }
        );
        this.setObserveTarget();
        this.syncWithMainProductForm();
      }

      setObserveTarget() {
        this.observer.observe(this.productFormActions);
        this.observeTarget = this.productFormActions;
      }

      checkDevice(e) {
        document.documentElement.style.setProperty('--sticky-atc-bar-height', this.clientHeight + 'px');
      }

      updateButton(disable = true, text, modifyClass = true) {
        const productForm = this.querySelector('#product-form-sticky-atc-bar');
        if (!productForm) return;

        const addButton = productForm.querySelector('[name="add"]');
        if (!addButton) return;

        const addButtonText = addButton.querySelector('span');
        if (disable) {
          addButton.setAttribute('disabled', 'disabled');
          if (text) addButtonText.textContent = text;
        } else {
          addButton.removeAttribute('disabled');
          addButtonText.textContent = FoxTheme.variantStrings.addToCart;
        }
      }

      updatePrice() {
        const classes = {
          onSale: 'f-price--on-sale',
          soldOut: 'f-price--sold-out',
        };
        const selectors = {
          priceWrapper: '.f-price',
          salePrice: '.f-price-item--sale',
          compareAtPrice: ['.f-price-item--regular'],
          unitPriceWrapper: '.f-price__unit-wrapper',
        };
        const moneyFormat = FoxTheme.settings.moneyFormat;
        const { priceWrapper, salePrice, unitPriceWrapper, compareAtPrice } = FoxTheme.utils.queryDomNodes(
          selectors,
          this
        );
        const unitPrice = unitPriceWrapper.querySelector('.f-price__unit');

        const { compare_at_price, price, unit_price_measurement } = this.currentVariant;

        // On sale.
        if (compare_at_price && compare_at_price > price) {
          priceWrapper.classList.add(classes.onSale);
        } else {
          priceWrapper.classList.remove(classes.onSale);
        }

        // Sold out.
        if (!this.currentVariant.available) {
          priceWrapper.classList.add(classes.soldOut);
        } else {
          priceWrapper.classList.remove(classes.soldOut);
        }

        if (salePrice) salePrice.innerHTML = FoxTheme.Currency.formatMoney(price, moneyFormat);

        if (compareAtPrice && compareAtPrice.length && compare_at_price > price) {
          compareAtPrice.forEach(
            (item) => (item.innerHTML = FoxTheme.Currency.formatMoney(compare_at_price, moneyFormat))
          );
        } else {
          compareAtPrice.forEach((item) => (item.innerHTML = FoxTheme.Currency.formatMoney(price, moneyFormat)));
        }

        if (unit_price_measurement && unitPrice) {
          unitPriceWrapper.classList.remove('hidden');
          const unitPriceContent = `<span>${FoxTheme.Currency.formatMoney(
            this.currentVariant.unit_price,
            moneyFormat
          )}</span>/<span data-unit-price-base-unit>${this._getBaseUnit()}</span>`;
          unitPrice.innerHTML = unitPriceContent;
        } else {
          unitPriceWrapper.classList.add('hidden');
        }
      }

      syncWithMainProductForm() {
        FoxTheme.pubsub.subscribe(FoxTheme.pubsub.PUB_SUB_EVENTS.variantChange, (event) => {
          const variant = event.data.variant;
          const variantInput = this.querySelector('[name="id"]');

          this.currentVariant = variant;
          variantInput.value = variant.id;
          this.updatePrice();
          this.updateButton(true, '', false);
          if (!variant) {
            this.updateButton(true, '', true);
          } else {
            this.updateButton(!variant.available, FoxTheme.variantStrings.soldOut);
          }
        });
      }
    }
  );
}
