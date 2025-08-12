import Holidays from 'date-holidays'

// 한국 공휴일 인스턴스
const holidays = new Holidays('KR')

/**
 * 특정 연도의 한국 공휴일 목록을 가져옵니다
 */
export function getKoreanHolidays(year: number) {
  return holidays.getHolidays(year)
}

/**
 * 특정 날짜가 한국 공휴일인지 확인합니다
 */
export function isKoreanHoliday(date: Date): boolean {
  const result = holidays.isHoliday(date)
  return result !== false && result !== null
}

/**
 * 특정 날짜의 공휴일 정보를 가져옵니다
 */
export function getHolidayInfo(date: Date) {
  const holidayList = holidays.getHolidays(date.getFullYear())
  return holidayList.find(holiday => {
    const holidayDate = new Date(holiday.date)
    return (
      holidayDate.getFullYear() === date.getFullYear() &&
      holidayDate.getMonth() === date.getMonth() &&
      holidayDate.getDate() === date.getDate()
    )
  })
}

/**
 * 날짜 문자열(YYYY-MM-DD)이 공휴일인지 확인합니다
 */
export function isHolidayByDateString(dateString: string): boolean {
  // 로컬 시간으로 날짜 생성하여 시간대 문제 방지
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return isKoreanHoliday(date)
}

/**
 * 특정 기간 내의 모든 공휴일을 가져옵니다
 */
export function getHolidaysInRange(startDate: Date, endDate: Date) {
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  const allHolidays = []
  
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getKoreanHolidays(year)
    allHolidays.push(...yearHolidays)
  }
  
  return allHolidays.filter(holiday => {
    const holidayDate = new Date(holiday.date)
    return holidayDate >= startDate && holidayDate <= endDate
  })
}

/**
 * 특정 주의 공휴일 개수를 계산합니다 (근무시간 계산용)
 */
export function getHolidayCountInWeek(startDate: Date, endDate: Date): number {
  const holidays = getHolidaysInRange(startDate, endDate)
  return holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date)
    const dayOfWeek = holidayDate.getDay()
    // 주말(토요일=6, 일요일=0)이 아닌 공휴일만 계산
    return dayOfWeek !== 0 && dayOfWeek !== 6
  }).length
}

