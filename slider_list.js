class UniversalSlider {
  constructor(sliderElemnt, config = {}) {
    this.selectors = {
      wrapper: config.wrapper || ".slider_wrapper, .photos_slider_wrapper",
      track: config.track || ".slider_track, .photos_slider_track",
      card: config.card || ".style_card, .photos_slider_card",
      prevBtn: config.prevBtn || ".prev-btn, .photos-prev-btn",
      nextBtn: config.nextBtn || ".next-btn, .photos-next-btn",
    };
  }
}
