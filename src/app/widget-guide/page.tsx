"use client";

import { useState, useEffect } from "react";

export default function WidgetGuidePage() {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  // 사용자 기기 확인
  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent));
    setIsAndroid(/Android/.test(userAgent));
    setIsSafari(/Safari/.test(userAgent) && !/Chrome/.test(userAgent));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            📱 출근/퇴근 위젯 사용법
          </h1>

          <div className="space-y-6">
            {/* 중요 안내 */}
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h2 className="text-xl font-semibold text-yellow-800 mb-3">
                ⚠️ 중요 안내
              </h2>
              <p className="text-gray-700 mb-3">
                PWA 위젯은 아직 실험적 기능입니다. 일부 기기에서는 위젯이
                표시되지 않을 수 있습니다.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• iOS 16.1+에서 제한적으로 지원</p>
                <p>• Android에서는 Chrome OS나 일부 런처에서만 지원</p>
                <p>• Safari에서 더 안정적으로 작동</p>
              </div>
            </div>

            {/* iOS 위젯 설정 */}
            {isIOS && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h2 className="text-xl font-semibold text-blue-800 mb-3">
                  🍎 iOS 위젯 설정
                </h2>
                <ol className="space-y-2 text-gray-700">
                  <li>1. Safari에서 그룹웨어 앱을 열어주세요</li>
                  <li>
                    2. 홈 화면에 앱을 설치해주세요 (공유 버튼 → "홈 화면에
                    추가")
                  </li>
                  <li>3. 홈 화면에서 빈 공간을 길게 누릅니다</li>
                  <li>4. 좌측 상단의 '+' 버튼을 탭합니다</li>
                  <li>5. "그룹웨어" 또는 "출퇴근"을 검색합니다</li>
                  <li>6. 원하는 크기의 위젯을 선택합니다</li>
                  <li>7. "위젯 추가"를 탭합니다</li>
                  <li>8. 홈 화면에 배치합니다</li>
                </ol>
                {!isSafari && (
                  <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      💡 Safari에서 더 안정적으로 작동합니다. Safari로
                      시도해보세요.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Android 위젯 설정 */}
            {isAndroid && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h2 className="text-xl font-semibold text-green-800 mb-3">
                  🤖 Android 위젯 설정
                </h2>
                <ol className="space-y-2 text-gray-700">
                  <li>1. Chrome에서 그룹웨어 앱을 열어주세요</li>
                  <li>2. 홈 화면에 앱을 설치해주세요</li>
                  <li>3. 홈 화면에서 빈 공간을 길게 누릅니다</li>
                  <li>4. "위젯" 또는 "위젯 추가"를 선택합니다</li>
                  <li>5. "그룹웨어" 앱을 찾습니다</li>
                  <li>6. 원하는 크기의 위젯을 선택합니다</li>
                  <li>7. 홈 화면에 배치합니다</li>
                </ol>
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ⚠️ Android에서는 제한적으로 지원됩니다. Chrome OS에서 더
                    안정적으로 작동합니다.
                  </p>
                </div>
              </div>
            )}

            {/* 일반 안내 */}
            {!isIOS && !isAndroid && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  📱 위젯 설정 안내
                </h2>
                <p className="text-gray-700 mb-3">
                  모바일 기기에서 위젯을 설정하려면:
                </p>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      iOS (iPhone/iPad)
                    </h3>
                    <p className="text-sm text-gray-600">
                      Safari에서 앱 설치 → 홈 화면 길게 누르기 → '+' 버튼 →
                      "그룹웨어" 검색 → 위젯 추가
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Android</h3>
                    <p className="text-sm text-gray-600">
                      Chrome에서 앱 설치 → 홈 화면 길게 누르기 → "위젯" →
                      "그룹웨어" 검색 → 위젯 추가
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 위젯 기능 설명 */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <h2 className="text-xl font-semibold text-purple-800 mb-3">
                ⚡ 위젯 기능
              </h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🕐</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">실시간 시계</h3>
                    <p className="text-sm text-gray-600">
                      현재 시간을 실시간으로 표시
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🌅</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">원클릭 출근</h3>
                    <p className="text-sm text-gray-600">
                      한 번의 탭으로 출근 기록
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🌆</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">원클릭 퇴근</h3>
                    <p className="text-sm text-gray-600">
                      한 번의 탭으로 퇴근 기록
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">상태 표시</h3>
                    <p className="text-sm text-gray-600">
                      기록 성공/실패 상태 표시
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      반응형 디자인
                    </h3>
                    <p className="text-sm text-gray-600">
                      위젯 크기에 따라 자동 조정
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 주의사항 */}
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h2 className="text-xl font-semibold text-yellow-800 mb-3">
                ⚠️ 주의사항
              </h2>
              <ul className="space-y-2 text-gray-700">
                <li>• 위젯 사용을 위해서는 먼저 앱에 로그인해야 합니다</li>
                <li>• 인터넷 연결이 필요합니다</li>
                <li>• 위젯은 앱과 동일한 계정으로 작동합니다</li>
                <li>
                  • 기록된 출퇴근 시간은 앱의 캘린더에서 확인할 수 있습니다
                </li>
                <li>
                  • PWA 위젯은 실험적 기능이므로 일부 기기에서 작동하지 않을 수
                  있습니다
                </li>
              </ul>
            </div>

            {/* 대안 제안 */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h2 className="text-xl font-semibold text-blue-800 mb-3">
                🔄 대안 방법
              </h2>
              <p className="text-gray-700 mb-3">
                위젯이 작동하지 않는 경우 다음 방법을 시도해보세요:
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">1.</span>
                  <span className="text-gray-700">
                    홈 화면에 PWA 앱을 설치하고 빠른 액세스
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">2.</span>
                  <span className="text-gray-700">
                    브라우저 북마크에 추가하여 빠른 접근
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">3.</span>
                  <span className="text-gray-700">앱 내 알림 기능 활용</span>
                </div>
              </div>
            </div>

            {/* 위젯 미리보기 */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-4 text-white">
              <h2 className="text-xl font-semibold mb-3">📱 위젯 미리보기</h2>
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-center mb-3 font-semibold">14:30</div>
                <div className="flex gap-2 mb-2">
                  <button className="flex-1 bg-white/30 rounded px-2 py-1 text-sm font-semibold">
                    🌅 출근
                  </button>
                  <button className="flex-1 bg-white/30 rounded px-2 py-1 text-sm font-semibold">
                    🌆 퇴근
                  </button>
                </div>
                <div className="text-center text-xs opacity-80">
                  출근/퇴근 위젯
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
