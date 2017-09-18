import Printer from './printer';

const NavigationLine = (function ($) {

  function NavigationLine(coursePresentation) {
    this.cp = coursePresentation;
    this.initProgressbar(this.cp.slidesWithSolutions);
    this.initFooter();
    this.initTaskAnsweredListener();
  }

  /**
   * Initializes xAPI event listener, updates progressbar when a task is changed.
   */
  NavigationLine.prototype.initTaskAnsweredListener = function () {
    var that = this;

    this.cp.elementInstances.forEach(function (element) {
      element.forEach(function (elementInstance) {
        if (elementInstance.on !== undefined) {
          elementInstance.on('xAPI', function (event) {
            var shortVerb = event.getVerb();
            if (shortVerb === 'interacted') {
              that.updateProgressBarTasksAtSlideNumber(that.cp.currentSlideIndex);
            }
            else if (shortVerb === 'completed') {
              event.setVerb('answered');
            }
            if (event.data.statement.context.extensions === undefined) {
              event.data.statement.context.extensions = {};
            }
            event.data.statement.context.extensions['http://id.tincanapi.com/extension/ending-point'] = that.cp.currentSlideIndex + 1;
          });
        }
      });
    });
  };

  /**
   * Initialize progress bar
   */
  NavigationLine.prototype.initProgressbar = function (slidesWithSolutions) {
    var supportsHover = true;
    if (navigator.userAgent.match(/iPad|iPod|iPhone/i) !== null) {
      supportsHover = false;
    }

    var that = this;

    // Remove existing progressbar
    if (this.cp.progressbarParts !== undefined && this.cp.progressbarParts) {
      this.cp.progressbarParts.forEach(function (pbPart) {
        pbPart.remove();
      });
    }

    that.cp.progressbarParts = [];

    var i;
    var slide;
    var $progressbarPart;
    var progressbarPartTitle;

    var clickProgressbar = function () {
      that.cp.jumpToSlide($(this).data('slideNumber'));
    };

    var mouseenterProgressbar = function (event) {
      that.createProgressbarPopup(event, $(this));
    };

    var mouseleaveProgressbar = function () {
      that.removeProgressbarPopup();
    };

    for (i = 0; i < this.cp.slides.length; i += 1) {
      slide = this.cp.slides[i];

      // Generate tooltip for progress bar slides
      progressbarPartTitle = that.cp.l10n.slide + ' ' + (i + 1);
      if (slide.keywords !== undefined && slide.keywords.length) {
        progressbarPartTitle = slide.keywords[0].main;
      }
      else if (that.cp.editor === undefined && i >= this.cp.slides.length - 1 && this.cp.showSummarySlide) {
        progressbarPartTitle = that.cp.l10n.summary;
      }

      $progressbarPart = $('<div>', {
        'class': 'h5p-progressbar-part'
      }).data('slideNumber', i)
        .data('keyword', progressbarPartTitle)
        .click(clickProgressbar)
        .appendTo(that.cp.$progressbar);

      // Add hover effect if not an ipad or iphone.
      if (supportsHover) {
        $progressbarPart
          .mouseenter(mouseenterProgressbar)
          .mouseleave(mouseleaveProgressbar);
      }

      if ((this.cp.editor === undefined) && (i === this.cp.slides.length - 1) && this.cp.showSummarySlide) {
        $progressbarPart.addClass('progressbar-part-summary-slide');
      }

      if (i === 0) {
        $progressbarPart.addClass('h5p-progressbar-part-show h5p-progressbar-part-selected');
      }

      // Create task indicator if less than 60 slides and not in editor
      if (this.cp.slides.length <= 60) {
        if (slide.elements !== undefined && slide.elements.length) {
          if (slidesWithSolutions[i] !== undefined && slidesWithSolutions[i].length) {
            var elementOptions = {
              'class': 'h5p-progressbar-part-has-task'
            };
            if (that.cp.previousState && that.cp.previousState.answered && that.cp.previousState.answered[i]) {
              elementOptions.class += ' h5p-answered';
            }

            $('<div>', elementOptions).appendTo($progressbarPart);
          }
        }
      }
      that.cp.progressbarParts.push($progressbarPart);
    }
  };

  NavigationLine.prototype.createProgressbarPopup = function (event, $parent) {
    var progressbarTitle = $parent.data('keyword');

    if (this.$progressbarPopup === undefined) {
      this.$progressbarPopup = H5P.jQuery('<div/>', {
        'class': 'h5p-progressbar-popup',
        'html': progressbarTitle
      }).appendTo($parent);
    }
    else {
      this.$progressbarPopup.appendTo($parent);
      this.$progressbarPopup.html(progressbarTitle);
    }

    var availableWidth = this.cp.$container.width();
    var popupWidth = this.$progressbarPopup.outerWidth();
    var parentWidth = $parent.outerWidth();
    var leftPos = ($parent.position().left + (parentWidth / 2) - (popupWidth / 2));

    // default behavior, this will allow it to automatically center
    var left = '';
    // If the popup overflows beyond the right bound of container
    if ((leftPos + popupWidth) >= availableWidth) {
      // Get the overflow amount in pixels
      var overflow = leftPos + popupWidth - availableWidth;
      // Get the difference between the pop up and the progress bar 'part'
      var diff = (popupWidth/2) - (parentWidth/2);
      // Reset the left position
      left = 1 - overflow - diff + 'px'; // +1 due to rounding in CSS
    }
    // If the popup overflows beyond the left bound of container
    else if (leftPos < 0) {
      left = '0';
    }

    this.$progressbarPopup.css('left', left);
  };

  NavigationLine.prototype.removeProgressbarPopup = function () {
    if (this.$progressbarPopup !== undefined) {
      this.$progressbarPopup.remove();
    }
  };

  /**
   * Initialize footer.
   */
  NavigationLine.prototype.initFooter = function () {
    var that = this;
    var $footer = this.cp.$footer;

    // Inner footer adjustment containers
    var $leftFooter = $('<div/>', {
      'class': 'h5p-footer-left-adjusted'
    }).appendTo($footer);

    var $rightFooter = $('<div/>', {
      'class': 'h5p-footer-right-adjusted'
    }).appendTo($footer);

    var $centerFooter = $('<div/>', {
      'class': 'h5p-footer-center-adjusted'
    }).appendTo($footer);

    // Left footer elements

    // Toggle keywords menu
    this.cp.$keywordsButton = $('<div/>', {
      'class': "h5p-footer-button h5p-footer-toggle-keywords",
      'title': this.cp.l10n.showKeywords,
      'role': 'button',
      'tabindex': '0'
    }).click(function (event) {
      if (!that.cp.presentation.keywordListAlwaysShow) {
        that.cp.toggleKeywords();
        event.stopPropagation();
      }
    }).keydown(function (e) { // Trigger the click event from the keyboard
      var code = e.which;
      // 32 = Space
      if (code === 32 || code === 13) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    }).appendTo($leftFooter);

    if (this.cp.presentation.keywordListAlwaysShow || !this.cp.initKeywords) {
      this.cp.$keywordsButton.hide();
    }

    if (!this.cp.presentation.keywordListEnabled) {
      // Hide in editor when disabled.
      this.cp.$keywordsWrapper.add(this.$keywordsButton).hide();
    }

    // Update keyword for first slide.
    this.updateFooterKeyword(0);

    // Center footer elements

    // Previous slide
    $('<div/>', {
      'class': 'h5p-footer-button h5p-footer-previous-slide',
      'title': this.cp.l10n.prevSlide,
      'role': 'button',
      'tabindex': '0'
    }).click(function () {
      that.cp.previousSlide();
    }).keydown(function (e) { // Trigger the click event from the keyboard
      var code = e.which;
      // 32 = Space
      if (code === 32) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    }).appendTo($centerFooter);

    // Current slide count
    this.cp.$footerCurrentSlide = $('<div/>', {
      'html': '1',
      'class': 'h5p-footer-slide-count-current',
      'title': this.cp.l10n.currentSlide
    }).appendTo($centerFooter);

    // Count delimiter, content configurable in css
    $('<div/>', {
      'html': '/',
      'class': 'h5p-footer-slide-count-delimiter'
    }).appendTo($centerFooter);

    // Max slide count
    this.cp.$footerMaxSlide = $('<div/>', {
      'html': this.cp.slides.length,
      'class': 'h5p-footer-slide-count-max',
      'title': this.cp.l10n.lastSlide
    }).appendTo($centerFooter);

    // Next slide
    $('<div/>', {
      'class': 'h5p-footer-button h5p-footer-next-slide',
      'title': this.cp.l10n.nextSlide,
      'role': 'button',
      'tabindex': '0'
    }).click(function () {
      that.cp.nextSlide();
    }).keydown(function (e) { // Trigger the click event from the keyboard
      var code = e.which;
      // 32 = Space
      if (code === 32) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    }).appendTo($centerFooter);

    // *********************
    // Right footer elements
    // *********************

    // Do not add these buttons in editor mode
    if (this.cp.editor === undefined) {

      // Exit solution mode button
      this.cp.$exitSolutionModeButton = $('<div/>', {
        'class': 'h5p-footer-exit-solution-mode',
        'title': this.cp.l10n.solutionModeTitle,
        'tabindex': '0'
      }).click(function (event) {
        that.cp.jumpToSlide(that.cp.slides.length - 1);
        event.preventDefault();
      }).keydown(function (e) { // Trigger the click event from the keyboard
        var code = e.which;
        // 32 = Space
        if (code === 32) {
          $(this).click();
          e.preventDefault();
        }
        $(this).focus();
      }).appendTo($rightFooter);

      // Print button
      if (this.cp.enablePrintButton && Printer.supported()) {
        this.cp.$printButton = $('<div/>', {
          'class': 'h5p-footer-button h5p-footer-print',
          'title': this.cp.l10n.printTitle,
          'role': 'button',
          'tabindex': '0'
        }).click(function () {
          var $h5pWrapper = $('.h5p-wrapper');

          Printer.showDialog(that.cp.l10n, $h5pWrapper, function (printAllslides) {
            Printer.print(that.cp, $h5pWrapper, printAllslides);
          });
        });
        this.cp.$printButton.appendTo($rightFooter);
      }

      if (H5P.fullscreenSupported) {
        // Toggle full screen button
        this.cp.$fullScreenButton = $('<div/>', {
          'class': 'h5p-footer-button h5p-footer-toggle-full-screen',
          'title': this.cp.l10n.fullscreen,
          'role': 'button',
          'tabindex': '0'
        }).click(function () {
          that.cp.toggleFullScreen();
        }).keydown(function (e) { // Trigger the click event from the keyboard
          var code = e.which;
          // 32 = Space
          if (code === 32) {
            $(this).click();
            e.preventDefault();
          }
          $(this).focus();
        });

        this.cp.$fullScreenButton.appendTo($rightFooter);
      }
    }

    // Solution mode text
    this.cp.$exitSolutionModeText = $('<div/>', {
      'html': '',
      'class': 'h5p-footer-exit-solution-mode-text'
    }).appendTo(this.cp.$exitSolutionModeButton);
  };

  /**
   * Updates progress bar.
   */
  NavigationLine.prototype.updateProgressBar = function (slideNumber, prevSlideNumber, solutionMode) {
    var that = this;

    // Updates progress bar progress (blue line)
    var i;
    for (i = 0; i < that.cp.progressbarParts.length; i += 1) {
      if (slideNumber + 1 > i) {
        that.cp.progressbarParts[i].addClass('h5p-progressbar-part-show');
      } else {
        that.cp.progressbarParts[i].removeClass('h5p-progressbar-part-show');
      }
    }

    that.cp.progressbarParts[slideNumber]
      .addClass("h5p-progressbar-part-selected")
      .siblings().removeClass("h5p-progressbar-part-selected");

    if (prevSlideNumber === undefined) {
      that.cp.progressbarParts.forEach(function (pbPart) {
        pbPart.children('.h5p-progressbar-part-has-task').removeClass('h5p-answered');
      });
      return;
    }
    // Don't mark answers as answered if in solution mode or editor mode.
    if (solutionMode || (that.cp.editor !== undefined)) {
      return;
    }
  };

  /**
   * Update progress bar task at provided slide number
   * @param {Number} slideNumber Slide number which will be updated
   */
  NavigationLine.prototype.updateProgressBarTasksAtSlideNumber = function (slideNumber) {
    var that = this;

    // Updates previous slide answer.
    var answered = true;
    if (this.cp.slidesWithSolutions[slideNumber] !== undefined && this.cp.slidesWithSolutions[slideNumber]) {
      this.cp.slidesWithSolutions[slideNumber].forEach(function (slideTask) {
        if (slideTask.getAnswerGiven !== undefined) {
          if (!slideTask.getAnswerGiven()) {
            answered = false;
          }
        }
      });
    }

    if (answered) {
      that.cp.progressbarParts[slideNumber]
        .children('.h5p-progressbar-part-has-task')
        .addClass('h5p-answered');
    }
  };

  /**
   * Update footer with current slide data
   *
   * @param {Number} slideNumber Current slide number
   */
  NavigationLine.prototype.updateFooter = function (slideNumber) {

    // Update current slide number in footer
    this.cp.$footerCurrentSlide.html(slideNumber + 1);
    this.cp.$footerMaxSlide.html(this.cp.slides.length);

    // Hide exit solution mode button on summary slide
    if (this.cp.isSolutionMode && slideNumber === this.cp.slides.length - 1) {
      this.cp.$footer.addClass('summary-slide');
    } else {
      this.cp.$footer.removeClass('summary-slide');
    }

    // Update keyword in footer
    this.updateFooterKeyword(slideNumber);
  };

  /**
   * Update keyword in footer with current slide data
   *
   * @param {Number} slideNumber Current slide number
   */
  NavigationLine.prototype.updateFooterKeyword = function (slideNumber) {
    var keywordString = '';
    // Get current keyword
    if (this.cp.$currentKeyword !== undefined && this.cp.$currentKeyword) {
      keywordString = this.cp.$currentKeyword.find('span').html();
    }

    // Summary slide keyword
    if (this.cp.editor === undefined && this.cp.showSummarySlide) {
      if (slideNumber >= this.cp.slides.length - 1) {
        keywordString = this.cp.l10n.summary;
      }
    }

    // Empty string if no keyword defined
    if (keywordString === undefined) {
      keywordString = '';
    }

    // Set footer keyword
    this.cp.$keywordsButton.html('<span>' + keywordString + '</span>');
  };

  return NavigationLine;
})(H5P.jQuery);

export default NavigationLine;