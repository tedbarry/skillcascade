export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-warm-50 z-50">
      <img
        src="/brand/icon-mark.jpg"
        alt="SkillCascade"
        className="w-24 h-24 loading-pulse mb-6"
      />
      <p className="text-lg font-semibold text-sage-700 font-display mb-4">SkillCascade</p>
      <div className="flex gap-2">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
    </div>
  )
}
