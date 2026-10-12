// 공학용 계산기 핵심 계산 함수
// eval이나 new Function 없이 직접 구현한 수식 파서

function trigDeg(fn, deg) {
  var norm = ((deg % 360) + 360) % 360;
  if (fn === 'sin') {
    if (norm === 0 || norm === 180) return 0;
    if (norm === 90) return 1;
    if (norm === 270) return -1;
    if (norm === 30 || norm === 150) return 0.5;
    if (norm === 210 || norm === 330) return -0.5;
    return Math.sin(deg * Math.PI / 180);
  }
  if (fn === 'cos') {
    if (norm === 90 || norm === 270) return 0;
    if (norm === 0) return 1;
    if (norm === 180) return -1;
    if (norm === 60 || norm === 300) return 0.5;
    if (norm === 120 || norm === 240) return -0.5;
    return Math.cos(deg * Math.PI / 180);
  }
  if (fn === 'tan') {
    if (norm === 90 || norm === 270) throw new Error('탄젠트 90도는 정의되지 않습니다');
    if (norm === 0 || norm === 180) return 0;
    if (norm === 45 || norm === 225) return 1;
    if (norm === 135 || norm === 315) return -1;
    return Math.tan(deg * Math.PI / 180);
  }
  throw new Error('알 수 없는 삼각함수입니다: ' + fn);
}

function evalFn(fnName, arg, isDegree) {
  if (typeof arg !== 'number' || isNaN(arg) || !isFinite(arg)) {
    throw new Error('계산할 수 없는 값입니다');
  }
  switch (fnName) {
    case 'sin':
      if (isDegree) return trigDeg('sin', arg);
      return Math.sin(arg);
    case 'cos':
      if (isDegree) return trigDeg('cos', arg);
      return Math.cos(arg);
    case 'tan':
      if (isDegree) return trigDeg('tan', arg);
      if (Math.abs(Math.cos(arg)) < 1e-15) throw new Error('탄젠트 값이 정의되지 않습니다');
      var t = Math.tan(arg);
      if (!isFinite(t)) throw new Error('탄젠트 값이 정의되지 않습니다');
      return t;
    case 'log':
      if (arg <= 0) throw new Error('로그의 진수는 0보다 커야 합니다');
      return Math.log10(arg);
    case 'ln':
      if (arg <= 0) throw new Error('로그의 진수는 0보다 커야 합니다');
      return Math.log(arg);
    case 'sqrt':
      if (arg < 0) throw new Error('음수의 제곱근은 계산할 수 없습니다');
      return Math.sqrt(arg);
    default:
      throw new Error('알 수 없는 함수입니다: ' + fnName);
  }
}

function cleanResult(val) {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    throw new Error('계산할 수 없는 식입니다');
  }
  if (Math.abs(val) < 1e-14) return 0;
  var rounded = Number(val.toPrecision(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function evaluate(expr, isDegree) {
  if (isDegree === undefined || isDegree === null) isDegree = true;
  if (typeof expr !== 'string') throw new Error('올바른 식을 입력해 주세요');

  var s = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi');

  var tokens = [];
  var i = 0;
  while (i < s.length) {
    var ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/\d/.test(ch) || (ch === '.' && i + 1 < s.length && /\d/.test(s[i + 1]))) {
      var numStr = '';
      while (i < s.length && (/\d/.test(s[i]) || s[i] === '.')) {
        if (s[i] === '.' && numStr.indexOf('.') >= 0) {
          throw new Error('소수점이 잘못되었습니다');
        }
        numStr += s[i];
        i++;
      }
      tokens.push({ type: 'NUM', value: Number(numStr) });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      var idStr = '';
      while (i < s.length && /[a-zA-Z]/.test(s[i])) {
        idStr += s[i];
        i++;
      }
      idStr = idStr.toLowerCase();
      if (idStr === 'pi') {
        tokens.push({ type: 'CONST', value: Math.PI });
      } else if (idStr === 'e') {
        tokens.push({ type: 'CONST', value: Math.E });
      } else if (['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'].indexOf(idStr) >= 0) {
        tokens.push({ type: 'FN', value: idStr });
      } else {
        throw new Error('알 수 없는 기호입니다: ' + idStr);
      }
      continue;
    }
    if (['+', '-', '*', '/', '^', '!', '%', '(', ')'].indexOf(ch) >= 0) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    throw new Error('인식할 수 없는 기호입니다: ' + ch);
  }

  if (tokens.length === 0) throw new Error('식을 입력해 주세요');

  var processedTokens = [];
  for (var j = 0; j < tokens.length; j++) {
    var cur = tokens[j];
    if (j > 0) {
      var prev = tokens[j - 1];
      var isPrevEnder =
        prev.type === 'NUM' ||
        prev.type === 'CONST' ||
        (prev.type === 'OP' && (prev.value === ')' || prev.value === '!' || prev.value === '%'));
      var isCurStarter =
        cur.type === 'NUM' ||
        cur.type === 'CONST' ||
        cur.type === 'FN' ||
        (cur.type === 'OP' && cur.value === '(');

      if (isPrevEnder && isCurStarter) {
        processedTokens.push({ type: 'OP', value: '*' });
      }
    }
    processedTokens.push(cur);
  }

  var pos = 0;

  function peek() {
    return pos < processedTokens.length ? processedTokens[pos] : null;
  }

  function consume(expectedVal) {
    var tok = peek();
    if (!tok) throw new Error('식이 완성되지 않았습니다');
    if (expectedVal && tok.value !== expectedVal) {
      throw new Error('예상치 못한 기호입니다: ' + tok.value);
    }
    pos++;
    return tok;
  }

  function parseExpression() {
    return parseAdditive();
  }

  function parseAdditive() {
    var left = parseMultiplicative();
    while (true) {
      var tok = peek();
      if (tok && tok.type === 'OP' && (tok.value === '+' || tok.value === '-')) {
        consume();
        var right = parseMultiplicative();
        if (tok.value === '+') left = left + right;
        else left = left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseMultiplicative() {
    var left = parseUnary();
    while (true) {
      var tok = peek();
      if (tok && tok.type === 'OP' && (tok.value === '*' || tok.value === '/')) {
        consume();
        var right = parseUnary();
        if (tok.value === '*') {
          left = left * right;
        } else {
          if (right === 0) throw new Error('0으로 나눌 수 없습니다');
          left = left / right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parseUnary() {
    var tok = peek();
    if (tok && tok.type === 'OP' && tok.value === '+') {
      consume();
      return +parseUnary();
    }
    if (tok && tok.type === 'OP' && tok.value === '-') {
      consume();
      return -parseUnaryPower();
    }
    return parsePower();
  }

  function parseUnaryPower() {
    var tok = peek();
    if (tok && tok.type === 'OP' && tok.value === '+') {
      consume();
      return +parseUnaryPower();
    }
    if (tok && tok.type === 'OP' && tok.value === '-') {
      consume();
      return -parseUnaryPower();
    }
    return parsePower();
  }

  function parsePower() {
    var left = parsePostfix();
    var tok = peek();
    if (tok && tok.type === 'OP' && tok.value === '^') {
      consume();
      var right = parseUnary();
      var res = Math.pow(left, right);
      if (isNaN(res) || !isFinite(res)) {
        throw new Error('계산할 수 없는 제곱입니다');
      }
      return res;
    }
    return left;
  }

  function parsePostfix() {
    var val = parsePrimary();
    while (true) {
      var tok = peek();
      if (tok && tok.type === 'OP' && tok.value === '!') {
        consume();
        if (val < 0 || !Number.isInteger(val)) {
          throw new Error('계승(!)은 0 이상의 정수만 가능합니다');
        }
        if (val > 170) {
          throw new Error('계산 결과가 너무 큽니다');
        }
        var fact = 1;
        for (var k = 2; k <= val; k++) fact *= k;
        val = fact;
      } else if (tok && tok.type === 'OP' && tok.value === '%') {
        consume();
        val = val / 100;
      } else {
        break;
      }
    }
    return val;
  }

  function parsePrimary() {
    var tok = peek();
    if (!tok) throw new Error('식이 완성되지 않았습니다');

    if (tok.type === 'NUM') {
      consume();
      return tok.value;
    }
    if (tok.type === 'CONST') {
      consume();
      return tok.value;
    }
    if (tok.type === 'FN') {
      var fnName = tok.value;
      consume();
      var next = peek();
      var arg;
      if (next && next.type === 'OP' && next.value === '(') {
        consume('(');
        arg = parseExpression();
        var closing = peek();
        if (!closing || closing.type !== 'OP' || closing.value !== ')') {
          throw new Error('괄호가 닫히지 않았습니다');
        }
        consume(')');
      } else {
        arg = parsePrimary();
      }
      return evalFn(fnName, arg, isDegree);
    }
    if (tok.type === 'OP' && tok.value === '(') {
      consume('(');
      var inner = parseExpression();
      var endParen = peek();
      if (!endParen || endParen.type !== 'OP' || endParen.value !== ')') {
        throw new Error('괄호가 닫히지 않았습니다');
      }
      consume(')');
      return inner;
    }

    throw new Error('올바르지 않은 기호입니다: ' + tok.value);
  }

  var result = parseExpression();

  if (pos < processedTokens.length) {
    throw new Error('올바르지 않은 식입니다: ' + processedTokens[pos].value);
  }

  return cleanResult(result);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluate: evaluate };
}
