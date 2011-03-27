/**
*	@name					  		BubbleValidate
*	@descripton					
*	@version						1.6.4
*	@requires						$ 1.2.6+
*
*	@author							Emery Denuccio
*	@author-email				emery.denuccio@gmail.com
*	@author-website			http://emerydenuccio.me
*
*/

/*
Form semantic structure

<form>
	<fieldset>
		<legend>Step Description</legend>
		<ol>
			<li>
				<label>Entry Item Label</label>
				<input placeholder="Example">
				<details>Assistive Text</details>
			</li>
		</ol>
	</fieldset>
</form>
*/

(function($){ 

	// Adds jquery object to data or creates it if it doesn't exist
	function addToData($e, key, val) {
		if($e.data(key))
			return $e.data(key, $e.data(key).add(val));
		else
			return $e.data(key, val);
	}

	var defaultOptions = {
	  'jqTransform': false,
	  'validationGroups': ['fieldset','section','form'],
	  'validationButtons': ['.pf_wizard_next','.pf_submit'],
	  'errorTarget': 'details'
	};
	
	var currentFocus = null;

	$.fn.extend({

		pf_val: function(new_val) {
			var $e = $(this);
			if($e.hasClass('pf_placeholder'))
				return '';
			else
				return (typeof new_val != 'undefined') ? $e.val(new_val) : $e.val();
	  },

		// Gets/sets the text that is visible to the user for a given element
		pf_renderedtext: function(new_text) {
			var $e = $(this);
			// Anything that renders its pf_val()
			if( $e.is('input') || $e.is('textarea') || $e.is('select') ) {
					return new_text ? $e.pf_val(new_text) : $e.pf_val();
			}

			// Everything else
			return new_text ? $e.html(new_text) : $e.html();
	  },

		pf_anychange: function(fn) {
			if(!$(this).length)
				return $(this);
				
			// Binds to all events that might change and checks last val with current
			$(this).bind('keyup change paste', function() {
				var last = $(this).data('pf_last_val');

				if($(this).pf_val() != last) {
					$(this).data('pf_last_val', $(this).pf_val());

					jQuery.event.trigger("pf_anychange", null, $(this)[0], false, null);
				}
			});

			$(this).data('pf_last_val', $(this).pf_val());
			var e = jQuery.event.add($(this)[0], "pf_anychange", fn, null);
			$(this).trigger('pf_anychange'); // Trigger initially
		 	//return e;

			return this;
	  },

		pf_showstep: function(fn) {		
			if(!$(this).length)
				return $(this);
					
		 	return jQuery.event.add($(this)[0], "pf_showstep", fn, null);

			return this;
	  },

		pf_allgood: function(fn) {		
			if(!$(this).length)
				return $(this);
					
		 	return jQuery.event.add($(this)[0], "pf_allgood", fn, null);

			return this;
	  },

		pf_anybad: function(fn) {		
			if(!$(this).length)
				return $(this);
					
		 	return jQuery.event.add($(this)[0], "pf_anybad", fn, null);

			return this;
	  },

		pf_transpose: function($to, transformer) {
			var $to = $($to);

			if(!$(this).length)
				return $(this);

			var $from = $(this);

			transformer = transformer || function(a) {return a;}
			addToData($from, 'pf_transpose_to', $to);
			$to.data('pf_transformer', transformer);

			$from.pf_anychange(function(){
				$from = $(this);

				var pf_transposeTo = $from.data('pf_transpose_to');

				if(pf_transposeTo) {
					var new_text = $from.pf_renderedtext();
					pf_transposeTo.each(function(){
						$dest = $(this);
						var t = $dest.data('pf_transformer');
						var new_text_t = t(new_text);
						if(new_text_t != '')
							$dest.removeClass("pf_placeholder");				
						$dest.pf_renderedtext(new_text_t);	
						$dest.trigger('pf_anychange');
					});
				}
			});

			return this;
		},
		
		pf_validated: function(result) {
			var $field = $(this);

			var $li = $field.closest('li');
			var $errors = $li.find('ul.pf_errors');
			var $form = $li.closest('form');
			
      $errorTarget = $li.find($form.data('pf_options').errorTarget);

			$details = $li.find('details');
			if($details.length == 0)
				$details = $('<details></details>').appendTo($li);
			
			if($errors.length == 0)
				$errors = $('<ul class="pf_errors"></ul>').appendTo($errorTarget);

			if((typeof result == 'object' && result.length > 0) || result === false) { // Has error(s)
				$field.removeClass('pf_valid');
				$li.removeClass('pf_valid');
			}
			else { // No errors
				$field.addClass('pf_valid').removeClass('pf_invalid');
				$li.addClass('pf_valid').removeClass('pf_invalid');
			}

			if(typeof result == 'object' && result.length > 0) { // Has displayable errors
				for(var i in result) {
					$errors.append('<li class="pf_error">'+result[i]+'</li>');
				}
			}

			// Convert server errors to normal errors after initial load,
			// i.e. force it to be changed manually
			$svr_errs = $errors.find('.pf_server_error');
			if($svr_errs.length != 0) {
				$svr_errs.removeClass('pf_server_error').addClass('pf_error');
				$li.removeClass('pf_valid').addClass('pf_invalid');
				//$li.find('label').appendTo($li); // Kind of a hack just to show the label on server errors
			}

			// Check if all validated fields in fieldset are valid
			$fieldset = $field.closest('fieldset');
			// If not constrained to fieldset, look for button in whole form
			if($fieldset.length == 0)
				$fieldset = $field.closest('form');

			var enclosures = ['fieldset','section','form'];
			var buttons = ['.pf_wizard_next','.pf_submit'];

      for(var i in enclosures) {
        $enclosure = $field.closest(enclosures[i]);
        if($enclosure.length) {
    			if($enclosure.find('li.pf_valid').length >= $enclosure.find('li.pf_validated').length) {
    				// Enable next button
    				$enclosure.find('.pf_wizard_next, .pf_submit').attr('disabled',false);
    				$enclosure.removeClass('pf_invalid').addClass('pf_valid');
    				//$fieldset.trigger('pf_allgood'); // Trigger allgood event for custom handling of completed forms
    			}
    			else {
    				// Disable next button
    				$enclosure.find('.pf_wizard_next, .pf_submit').attr('disabled',true);
    				$enclosure.removeClass('pf_valid');
    				//$fieldset.trigger('pf_anybad'); // Trigger anybad event for custom handling of completed forms
    			}
			  }
			}
			

			if($field.get(0) != currentFocus)
			  $field.trigger('blur');
			
      /*
			if($form.find('li.pf_valid').length >= $form.find('li.pf_validated').length) {
				// Enable next button
				$form.find('.pf_submit').attr('disabled',false);
				$form.removeClass('pf_invalid').addClass('pf_valid');
				//$fieldset.trigger('pf_allgood'); // Trigger allgood event for custom handling of completed forms
			}
			else {
				// Disable next button
				$form.find('.pf_submit').attr('disabled',true);
				$form.removeClass('pf_invalid').addClass('pf_valid');
				//$fieldset.trigger('pf_anybad'); // Trigger anybad event for custom handling of completed forms
			}
			*/
		},

		pf_validate: function(validator) {
			if(!$(this).length)
				return $(this);
				
			var $field = $(this);
			var $li = $field.closest('li');

			$field.focus(function(){
  			currentFocus = $(this).get(0);			  
			});

			// Disable next button since we are enforcing some validation
			var $fieldset = $field.closest('fieldset');
			if($fieldset.length == 0)
				$fieldset = $field.closest('form');
			$fieldset.find('.pf_wizard_next, .pf_submit').attr('disabled',true);

			$field.data('pf_validator', validator);
			$field.addClass('pf_validated');
			$li.addClass('pf_validated');

			$field.pf_anychange(function(){
				$field = $(this);
				
				var $li = $field.closest('li');
				var $errors = $li.find('ul.pf_errors');
				var $form = $li.closest('form');
				
				var v = $field.data('pf_validator');
			
				var result = v($field.pf_val());

        $errorTarget = $li.find($form.data('pf_options').errorTarget);

				if($errors.length == 0)
					$errors = $('<ul class="pf_errors"></ul>').appendTo($errorTarget);
				else
					$errors.find('.pf_error').remove();

				if((typeof result != 'undefined'))
					$field.pf_validated(result);

			});

			$field.blur(function(){
				$li = $(this).closest('li');
				$fieldset = $li.closest('fieldset');
				
			  if($(this).pf_val() == '') {
			    $li.removeClass('pf_invalid');
		    }
		    else {
				  if($li.find('.pf_validated').length > $li.find('.pf_valid').length)
					  $li.removeClass('pf_valid').addClass('pf_invalid');
				  //else
				  //  $li.removeClass('pf_invalid').addClass('pf_valid');
			  }

				if($fieldset.find('li.pf_invalid').length > 0)
				  $fieldset.removeClass('pf_valid').addClass('pf_invalid');
				else
				  $fieldset.removeClass('pf_invalid');
			});

			return this;
		},

		pf_step: function(index, change_hash) {

			var $wizard = $(this).closest('form');
			var $indices = $wizard.find('.pf_wizard_indices')
			var $active = $wizard.find('.pf_wizard_index_active');

			if(index === 'next')
				index = $active.index()+1;
			else if(index === 'back')
				index = $active.index()-1;

			if($active.index() == index)
				return;

			// Deactivate current
			$active.removeClass('pf_wizard_index_active');

			// Mark it done only if we are stepping forward
			if($active.index() < index)
				$active.addClass('pf_wizard_index_done')
					.html('<span>&#10003;</span>');

			// Activate appropriate
			$indices.find('.pf_wizard_index_'+(index))
				.addClass('pf_wizard_index_active')
				.find('span')
				.text(index+1);

			// Deactivate current step
			$wizard.find('.pf_wizard_step_active')
				.removeClass('pf_wizard_step_active')
				.hide(); // slideUp

			$wizard.find('.pf_wizard_step_'+(index))
				.addClass('pf_wizard_step_active')
				.trigger('pf_showstep')
				.fadeIn(); // slideDown
				
			if(change_hash !== false)
			  location.hash = '#step-'+(index+1);

			//setTimeout(function() {$pf.find('pf_wizard_step_active *[autofocus=true]').focus();}, 0);
			
			return this;
		},

		pf_wizard: function() {
		  
		  //this.options = $.extend(perfectform.option, P{, options);
			
			// --- Build a wizard from fieldsets if any ---

			var $fieldsets = $(this);

			if($fieldsets.length) {

				var $indices = $fieldsets.find('.pf_wizard_indices');
			  if(!$indices.length)
			    $indices = $('<div class="pf_wizard_indices"></div>');

				var id_prefix = $(this).id ? $(this).id + '-' : '';

				$fieldsets.each(function(i){
				
					var $wizard = $(this).closest('form');
				
					var $step = $(this);
					$step.addClass('pf_wizard_step_'+(i)); // Add pf_wizard_step_n class to fieldset

					var $index = $('<a class="pf_wizard_index'+' pf_wizard_index_'+(i)+'"><span>'+(i+1)+'</span></a>'); // Create index in indices box

					$index.click(function(e){
						e.preventDefault();
						$(this).pf_step($(this).index());
					});

					// First index
					if(i == 0) {
						$index.addClass('pf_wizard_index_active');
						$step.addClass('pf_wizard_step_active');
					}
					// Others
					else {
						$(this).hide();

						var $back_button = $(this).find('.pf_wizard_back');
						if(!$back_button.length)
						  $back_button = $('<button class="pf_wizard_back">Back</button>').appendTo(this);

						$back_button.click(function(e){
							e.preventDefault();
							$(this).pf_step('back');
						});
					}
					
				  var $next_button = $(this).find('.pf_wizard_next');

					// If not last index
					if(i+1 == $fieldsets.length) {
						if(!$next_button.length)
						  $('<button class="pf_wizard_next">Finish</button>').appendTo(this);
					}
					else {
						if(!$next_button.length)
						  $('<button class="pf_wizard_next">Next step</button>').appendTo(this);

						$next_button.click(function(e){
							e.preventDefault();
							$(this).pf_step('next');
						});
					}

					// Add number to index box
					$indices.append($index)
				});
				
				$('<a class="pf_wizard_index'+' pf_wizard_index_2"><span>'+3+'</span></a>').appendTo($indices); // Create index in indices box
				

				$(this).prepend($indices);
			}

      // Hashchange handler
  	  $(window).hashchange( function(){
  		  var hash = location.hash;
  		  var index = hash.match(/\#?step\-([0-9]+)/);

  		  if(index && index[1])
  		    index = parseInt(index[1])-1;
  		  else
  		    index = 0;

    		$('.perfectform').pf_step(index, false);

  	  })

			return this;
		},

		pf_pluralize: function(num,sing,plur) {

			var $num = $(num);
			var $term = $(this);

			plur = plur || $term.data('pf_plural');
			plur = plur || $term.text();
			sing = sing || $term.data('pf_singular');
			sing = sing || plur.substring(0, plur.length-1);
			$term.data('pf_plural', plur);
			$term.data('pf_singular', sing);

			if($num.data('pf_pluralizes')) {
				var bleh = $num.data('pf_pluralizes').add($term);
				$num.data('pf_pluralizes', bleh);
			}
			else {
				$num.data('pf_pluralizes', $term);
			}

			$num.pf_anychange(function(){

				$num = $(this);
				$terms = $(this).data('pf_pluralizes');

				$terms.each(function(){
					$term = $(this);

					plur = $term.data('pf_plural');
					sing = $term.data('pf_singular');

					if(parseInt($num.pf_val()) == 1)
						$term.pf_renderedtext(sing);
					else
						$term.pf_renderedtext(plur);
				});

			});
		},

		perfectform: function(options) {
			var $pf = $(this);

			$pf.data('pf_options', $.extend(defaultOptions, options));

		  $pf.find("input[title],textarea[title]")
		      .each( showPlaceholder ) // initialize each control on page load
		      .blur( showPlaceholder )
		      .focus( hidePlaceholder );

		  $pf.submit( function() {
		  	$("input[title],textarea[title]", this).each( hidePlaceholder );
		  } );
		  
		  $pf.submit(function(e) {
		    if($pf.hasClass('pf_submitting')) {
		      e.preventDefault();
		    }
		    else {
		      $pf.addClass('pf_submitting');
	      }
		  });

		  function showPlaceholder() {
		  	var $control = $(this);
		      var placeholderText = $control.attr("title");
		      if ( $control.val() === "" || $control.val() === placeholderText ) {
		      	$control.addClass("pf_placeholder");
		          $control.val(placeholderText);
		      }
		  };

		  function hidePlaceholder() {
		  	var $control = $(this);
		      if ( $control.val() === $control.attr("title") ) {
		      	$control.removeClass("pf_placeholder");
		      	$control.val("");
		      }
		  }

			//setTimeout(function() {$pf.find('*[autofocus=true]').focus().val('').removeClass('pf_placeholder');}, 0);

			$(window).unload(hidePlaceholder);


/*
			// Handles any user edit to the element
			this.pf_anychange = function($e, handler) {
				// Binds to all events that might change and checks last val with current
				$e.bind('keyup change paste', function() {
					var last = $(this).data('pf_last_val');

					if($(this).pf_val() != last) {
						$(this).data('pf_last_val', $(this).pf_val());

						handler.call($(this));
					}
				});

				handler.call($e);
			};
			
*/

			/*
			
			// If select, pluralize all of the options
			if($term.is('select'))
				$term = $term.find('option');
			
			*/

			// ----------------------------------------
			// This is where we symantically apply our modifications given the defined structure
			// ----------------------------------------

      
			// --- Move server response errors to associated list items ---
			$pf.find('.pf_server_errors .pf_server_error').each(function(){
				var $err = $(this);
				var $pf = $err.closest('form');
				var err_id = $err.attr('id');
				var field_id = err_id.replace(/pf_error_/, '');

				var $field = $pf.find('#'+field_id);
				var $li = $field.closest('li');
				var $errorTarget = $li.find($pf.data('pf_options').errorTarget);

			//	$details = $li.find('details');
			//	if($details.length == 0)
			//		$details = $('<details></details>').appendTo($li);
				$err_list = $li.find('.pf_errors');
				if($err_list.length == 0)
					$err_list = $('<ul class="pf_errors"></ul>').appendTo($errorTarget);

				$($li,$field).addClass('pf_invalid');
				$err.clone().appendTo($err_list);
				
				$field.trigger('blur'); // Bubble errors
			});

			// --- Sentence completing checkboxes ---
			$pf.find('.pf_expanded, .pf_collapsed').click(function(e) {
					var $exp = $(this);
					//$checkbox = $exp.find('input[type=checkbox]');

					if($exp.hasClass('pf_collapsed')) {
						$exp.removeClass('pf_collapsed')
						.addClass('pf_expanded');
					}
					else {
						$exp.removeClass('pf_expanded')
						.addClass('pf_collapsed');
					}

			
/*
				$checkbox.click(function() { // And show them on click
					$exp = $(this).closest('.pf_expand');
					
					$exp.find('.pf_collapsed').addClass('pf_expanded');
					
					/*
					if($(this).is(':checked')) {
						$exp.find('.pf_collapsed').addClass('pf_expanded')
						.removeClass('pf_collapsed');
					}
					else {
						$exp.find('.pf_expanded').removeClass('pf_expanded')
						.addClass('pf_collapsed');
					}
				});
				*/
				
			});

			// --- Pluralize unit-type select following quantity input ---
			$pf.find('input + select > option').each(function() {
				var $option = $(this);
				var $select = $option.parent();
				var $input = $select.prev();

				$option.pf_pluralize($input);
			});


			this.each( function() {
				var $form = $(this);

				//$form.find('details').hide();

				//$form.find('input, textarea, select').perfectform.pf_anychange()

				$form.find('label').each(function(i){
					$label = $(this);
					$li = $label.closest('li');
					$li.find('input');
				});

				$form.find('input, textarea, select').focus(function(){
					$li = $(this).closest('li');
					$details = $li.find('details');
					//$details.show();
					//$li.find('label').prependTo($details);

				}).blur(function(){
					$li = $(this).closest('li');
					$details = $li.find('details');
					//$details.hide();
					if($(this).pf_val().length > 0)
						$details.find('label').appendTo($li);
				});

				//$form.find('details').hide();
				
			});
		

			return this;

    }
  });
})($);
