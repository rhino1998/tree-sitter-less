module.exports = grammar({
  name: 'less',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  externals: $ => [
    $._descendant_operator,
  ],

  conflicts: $ => [
    [$._single_value, $._selector],
    [$.declaration, $._selector, $.last_declaration],
    [$.declaration, $._selector],
    [$._value, $.compound_value],
    [$.compound_value],
    [$.params, $._single_value],
    [$._mixin_name, $._selector],
    [$.mixin_def, $._mixin_name],
    [$.plain_value],
    [$.identifier],
  ],

  inline: $ => [],

  rules: {
    stylesheet: $ => repeat($._item),

    _item: $ => choice(
      $.rule_set,
      $.mixin_def,
      $.declaration,
      $.variable_def,
      $.mixin,
      $.import_statement,
      $.plugin_statement,
      $.supports_statement,
      $.charset_statement,
      $.keyframes_statement,
      $.media_statement,
      $.namespace_statement,
      $.at_rule,
    ),

    rule_set: $ => seq(
      field('selectors', $.selectors),
      field('rules', $.block),
    ),

    mixin_def: $ => seq(
      field('name', choice($.class_selector, $.id_selector)),
      field('params', $.params),
      field('guard', optional($.guard)),
      field('rules', $.block),
    ),

    mixin: $ => seq(
      field('namespace', optional(repeat($._mixin_name))),
      field('name', $._mixin_name),
      field('args', $.arguments),
      ';',
    ),

    _mixin_name: $ => choice(
      $.class_selector,
      $.id_selector,
      $.variable,
    ),

    import_statement: $ => prec.right(seq(
      "@import",
      field('options', optional(prec(1, seq(
        '(',
        sep(',', alias($.identifier, $.import_option)),
        ')'
      )))),
      field('import', $._single_value),
      field('queries', repeat(prec.right($._value))),
      ';',
    )),

    plugin_statement: $ => prec.right(seq(
      "@plugin",
      field('plugin', $._single_value),
      ';',
    )),

    supports_statement: $ => seq(
      '@supports',
      $._query,
      $.block
    ),
    namespace_statement: $ => seq(
      '@namespace',
      field('prefix', optional(alias($.identifier, $.namespace_name))),
      field('namespace', choice($.string_value, $.call_expression)),
      ';'
    ),

    keyframes_statement: $ => seq(
      field('keyword', alias(choice(
        '@keyframes',
        /@[-a-z]+keyframes/
      ), $.keyword)),
      field('name', choice(
        alias($.identifier, $.keyframes_name),
        $.variable,
      )),
      $.block,
    ),

    media_statement: $ => seq(
      '@media',
      sep1(',', $._query),
      $.block
    ),

    charset_statement: $ => seq(
      '@charset',
      $._value,
      ';'
    ),

    at_rule: $ => seq(
      $.at_keyword,
      field('queries', sep(',', $._query)),
      choice(';', $.block)
    ),

    at_keyword: $ => seq(
      '@',
      $._identifier,
    ),

    // Queries

    _query: $ => choice(
      alias($.identifier, $.keyword_query),
      $.feature_query,
      $.binary_query,
      $.unary_query,
      $.selector_query,
      $.parenthesized_query
    ),

    feature_query: $ => seq(
      '(',
        alias($.identifier, $.feature_name),
      ':',
      repeat1($._value),
      ')'
    ),

    parenthesized_query: $ => seq(
      '(',
      $._query,
      ')'
    ),

    binary_query: $ => prec.left(seq(
      $._query,
      choice('and', 'or'),
      $._query
    )),

    unary_query: $ => prec(1, seq(
      choice('not', 'only'),
      $._query
    )),

    selector_query: $ => seq(
      'selector',
      '(',
      $._selector,
      ')'
    ),

    // Blocks

    block: $ => seq(
      '{',
      field('stmts', repeat($._item)),
      optional(alias($.last_declaration, $.declaration)),
      '}'
    ),

    declaration: $ => seq(
      field('property', alias($.identifier, $.property_name)),
      ':',
      field('value', $._value),
      ';',
    ),

    last_declaration: $ => seq(
      field('property', alias($.identifier, $.property_name)),
      ':',
      field('value', $._value),
    ),

    // Guards

    guard: $ => seq(
      'when',
      $._guard_expression,
    ),

    _guard_expression: $ => choice(
      $._guard_parenthesized_expression,
      $.guard_unary_expression,
      $.guard_binary_expression,
    ),

    _guard_parenthesized_expression: $ => seq(
      '(',
      $._value,
      ')'
    ),

    guard_unary_expression: $ => prec.left(seq(
      field('op', choice('not', 'only')),
      field('expr', $._guard_expression),
    )),

    guard_binary_expression: $ => prec.left(seq(
      field('left', $._guard_expression),
      field('op', choice('and', 'or')),
      field('right', $._guard_expression),
    )),

    // Variables

    variable: $ => prec(1, seq(
      '@',
      field('name', alias($._identifier, $.variable_name))
    )),

    expand_variable: $ => seq(
      '@@',
      field('name', alias($._identifier, $.variable_name))
    ),

    variable_def: $ => prec(1, seq(
      field('name', $.variable),
      ':',
      choice(
        seq(
          field('value', $._selector_value),
        ';',
        ),
        field('value', $.block),
      ),
    )),

    interpolated_variable: $ => seq(
      '@',
      token.immediate('{'),
      field('name', alias($._identifier, $.variable_name)),
      '}',
    ),

    identifier: $ => repeat1(
      choice(
        $._identifier,
        $.interpolated_variable,
      ),
    ),

    plain_value: $ => $._plain_value_cont,

    _plain_value_cont: $ => prec.left(seq(
      $._plain_value,
      optional($.interpolated_variable),
      optional($._plain_value_cont),
    )),

    _selector_value: $ => prec.left(choice(
      $._selector,
      $._value,
    )),

    selectors: $ => prec.left(1, seq(
      $._selector,
      optional(
        seq(
          ',',
          sep1(',', prec.right(1, $._selector)),
        ),
      ),
    )),

    _selector: $ => choice(
      alias($.identifier, $.tag_name),
      $.universal_selector,
      $.nesting_selector,
      $.compound_selector,
      $.descendant_selector,
      $.child_selector,
      $.sibling_selector,
      $.adjacent_sibling_selector,
      $.attribute_selector,
      $.slash_selector,
      $.id_selector,
      $.class_selector,
      $.pseudo_class_selector,
      $.pseudo_element_selector,
      $.integer_value,
      $.float_value,
    ),

    universal_selector: $ => prec(-1, '*'),

    nesting_selector: $ => '&',


    compound_selector: $ => prec.right(2, seq(
      $._selector,
      repeat1(
        prec.right(2, $._selector)
      ),
    )),

    descendant_selector: $ => prec.left(seq(
      field('ancestor', $._selector), 
      $._descendant_operator, 
      field('descendant', $._selector)
    )),


    child_selector: $ => prec.left(seq(
      field('parent', $._selector), 
      '>', 
      field('child', $._selector)
    )),

    sibling_selector: $ => prec.left(seq(
      field('left', $._selector), 
      '~',
      field('right', $._selector)
    )),

    adjacent_sibling_selector: $ => prec.left(seq(
      field('left', $._selector), 
      '+',
      field('right', $._selector)
    )),

    slash_selector: $ => $._slash_identifier,

    id_selector: $ => prec.left(seq(
      '#',
      field('name', alias($.identifier, $.id_name)),
    )),

    class_selector: $ => prec.left(seq(
      '.',
      field('name', alias($.identifier, $.class_name)),
    )),

    pseudo_class_selector: $ => seq(
      ':',
      field('name', alias($.identifier, $.class_name)),
      field('args', optional(alias($.pseudo_class_arguments, $.arguments))),
    ),

    pseudo_class_arguments: $ => seq(
      token.immediate('('),
      sep(',', choice($._selector, repeat1($._value))),
      ')'
    ),

    pseudo_element_selector: $ => seq(
      '::',
      field('name', alias($.identifier, $.tag_name)),
    ),

    attribute_selector: $ => seq(
      '[',
      field('name', alias($.identifier, $.attribute_name)),
      optional(seq(
        field('op', choice('=', '~=', '^=', '|=', '*=', '$=')),
        field('value', $._value),
      )),
      ']'
    ),

    arguments: $ => prec.left(seq(
      '(',
      sep(
        choice(',', ';'), 
        $._value,
      ),
      ')',
    )),

    params: $ => prec.left(seq(
      '(',
      sep(
        choice(',', ';'),
        choice(
          $.keyword_param,
          $.identifier,
          $.variable,
        ),
      ),
      ')'
    )),

    keyword_param: $ => seq(
      field('var', $.variable),
      ':',
      field('value', $._value),
    ),


    _value: $ => prec.right(1, choice(
      $.block,
      $.compound_value,
      $._single_value,
    )),

    _single_value: $ => choice(
      alias($._literal, $.keyword),
      alias($.identifier, $.plain_value),
      $.plain_value,
      $.variable,
      $.parenthesized_value,
      $.color_value,
      $.float_value,
      $.integer_value,
      $.string_value,
      $.important_value,
      $.call_expression,
      $.binary_expression,
      $.index_expression,
    ),

    compound_value: $ => prec.left(seq(
      $._single_value,
      sep1(
        optional(choice($._descendant_operator, ',')), 
        prec.left($._single_value)
      ),
    )),

    parenthesized_value: $ => prec.left(seq(
      '(',
      $._value,
      ')',
    )),

    important_value: $ => prec.right(seq(
      $._value,
      "!important",
    )),


    color_value: $ => seq('#', token.immediate(/[0-9a-fA-F]{3,8}/)),

    string_value: $ => choice(
      $._escaped_string_value,
      $._string_value,
    ),

    _escaped_string_value: $ => choice(
      seq('~', token.immediate('"'), repeat(choice(/([^"\n]|\\(.|\n))/, $._string_misc_characters,  $.interpolated_variable)), '"'),
      seq('~', token.immediate("'"), repeat(choice(/([^'\n]|\\(.|\n))/, $._string_misc_characters, $.interpolated_variable)), "'"),
    ),

    _string_value: $ => choice(
      seq('"', repeat(choice(/([^"\n]|\\(.|\n))/, $._string_misc_characters, $.interpolated_variable)), '"'),
      seq("'", repeat(choice(/([^'\n]|\\(.|\n))/, $._string_misc_characters, $.interpolated_variable)), "'"),
    ),

    _string_misc_characters: $ => token(prec(2, choice(
      /@[^\{]/, '//', '/*', '*/',
    ))),

    integer_value: $ => seq(
      token(prec(1, seq(
        optional(choice('+', '-')),
        /\d+/
      ))),
      optional($.unit)
    ),

    float_value: $ => seq(
      token(prec(2, seq(
        optional(choice('+', '-')),
        /\d*/,
        choice(
          seq('.', /\d+/),
          seq(/[eE]/, optional('-'), /\d+/),
          seq('.', /\d+/, /[eE]/, optional('-'), /\d+/)
        )
      ))),
      optional($.unit)
    ),

    unit: $ => token.immediate(/[a-zA-Z%]+/),


    call_expression: $ => prec.left(1, seq(
      field('name', alias($.identifier, $.function_name)),
      field('args', $.arguments),
    )),

    binary_expression: $ => prec.left(seq(
      field('left', $._single_value),
      field('op', choice('+', '-', '/', '*', '>=', '<=', '>', '<', '=')),
      field('right', $._single_value),
    )),

    index_expression: $ => seq(
      field('target', $._single_value),
      token.immediate('['),
      field('index', $._index),
      ']',
    ),

    _index: $ => choice(
      $.variable,
      $.expand_variable,
      alias($.identifier, $.property_name),
    ),

    _literal: $ => choice(
      'true',
      'false',
      'from',
      'to',
    ),

    _identifier: $ => /[a-zA-Z-_][a-zA-Z0-9-_]*/,

    _slash_identifier: $ => /\/[a-zA-Z-_][a-zA-Z0-9-_]*\//,

    comment: $ => token(choice(
      seq(
        '//',
        /.*/,
      ),
      seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/'
    ))),

    _plain_value: $ => token(seq(
      repeat(choice(
        /[-_]/,
        /\/[^\*\s,;!{}()\[\]@]/ // Slash not followed by a '*' (which would be a comment)
      )),
      /[a-zA-Z]/,
      repeat(choice(
        /[^/\s,;!{}()\[\]@]/,   // Not a slash, not a delimiter character
        /\/[^\*\s,;!{}()\[\]@]/ // Slash not followed by a '*' (which would be a comment)
      ))
    )),

  }
})

function sep (separator, rule) {
  return optional(sep1(separator, rule))
}

function sep1 (separator, rule) {
  return seq(rule, repeat(seq(separator, rule)))
}
