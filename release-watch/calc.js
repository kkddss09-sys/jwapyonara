/**
 * 좌표나라 휴대폰 출시일 시계 계산 및 데이터 도우미 함수
 */

function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  var parts = str.trim().split('-');
  if (parts.length !== 3) return null;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null;
  var dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function calcDaysLeft(targetDateStr, todayStr) {
  var target = parseDate(targetDateStr);
  if (!target) return null;

  var today;
  if (todayStr) {
    today = parseDate(todayStr);
  } else {
    var now = new Date();
    today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  if (!today) return null;

  var diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

function formatDDay(daysLeft) {
  if (daysLeft === null || isNaN(daysLeft)) return '-';
  if (daysLeft > 0) return 'D-' + daysLeft;
  if (daysLeft === 0) return 'D-Day (오늘)';
  return '출시 완료 (' + Math.abs(daysLeft) + '일 전)';
}

function findNextOfficialRelease(items, todayStr) {
  if (!Array.isArray(items) || items.length === 0) return null;

  var candidates = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item) continue;
    // 공식 배지이거나 공식 출시 날짜가 명시된 경우만
    if (item.status === '공식' || item.officialDate) {
      var dateStr = item.officialDate || (parseDate(item.expected) ? item.expected : null);
      if (dateStr) {
        var days = calcDaysLeft(dateStr, todayStr);
        if (days !== null && days >= 0) {
          candidates.push({
            item: item,
            dateStr: dateStr,
            daysLeft: days
          });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // 가장 가까운 날짜 순 정렬
  candidates.sort(function (a, b) {
    return a.daysLeft - b.daysLeft;
  });

  return candidates[0];
}

function getNextReleaseSummary(items, todayStr) {
  var nextOfficial = findNextOfficialRelease(items, todayStr);
  if (!nextOfficial) {
    return {
      found: false,
      title: '다음 출시까지',
      badge: '공식 발표 전',
      sub: '현재 등록된 기종은 해외 보도 및 유출 단계이며, 공식 확정 시 D-day가 표시됩니다.'
    };
  }

  return {
    found: true,
    title: nextOfficial.item.model + ' 출시까지',
    badge: formatDDay(nextOfficial.daysLeft),
    daysLeft: nextOfficial.daysLeft,
    dateStr: nextOfficial.dateStr,
    model: nextOfficial.item.model,
    sub: '공식 발표일(' + nextOfficial.dateStr + ') 기준 남은 날짜입니다.'
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseDate: parseDate,
    calcDaysLeft: calcDaysLeft,
    formatDDay: formatDDay,
    findNextOfficialRelease: findNextOfficialRelease,
    getNextReleaseSummary: getNextReleaseSummary
  };
}
