# encoding: utf-8
# iOS 프로젝트에 Firebase SPM·푸시 capability·plist 연결을 자동 적용한다.
# (Xcode GUI의 Package Dependencies / Signing & Capabilities 작업과 동일)
require 'xcodeproj'

PROJ = '/Users/maesterong/cotion/.claude/worktrees/stupefied-lalande-70ea82/packages/frontend/ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(PROJ)
app = project.targets.find { |t| t.name == 'App' }
changed = []

# 1. Firebase iOS SDK (SPM) + 제품 링크
FIREBASE_URL = 'https://github.com/firebase/firebase-ios-sdk.git'
ref = project.root_object.package_references.find do |r|
  r.respond_to?(:repositoryURL) && r.repositoryURL.to_s.include?('firebase-ios-sdk')
end
unless ref
  ref = project.new(Xcodeproj::Project::Object::XCRemoteSwiftPackageReference)
  ref.repositoryURL = FIREBASE_URL
  ref.requirement = { 'kind' => 'upToNextMajorVersion', 'minimumVersion' => '11.0.0' }
  project.root_object.package_references << ref
  changed << 'Firebase SPM package reference (>= 11.0.0)'
end

['FirebaseCore', 'FirebaseMessaging'].each do |product|
  next if app.package_product_dependencies.any? { |d| d.product_name == product }
  dep = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
  dep.package = ref
  dep.product_name = product
  app.package_product_dependencies << dep
  bf = project.new(Xcodeproj::Project::Object::PBXBuildFile)
  bf.product_ref = dep
  app.frameworks_build_phase.files << bf
  changed << "Link product: #{product}"
end

# 기준 그룹/디렉토리: Info.plist 참조가 속한 곳 (= ios/App/App)
info_ref = project.files.find { |f| f.display_name == 'Info.plist' }
parent_group = info_ref.parent
app_dir = info_ref.real_path.dirname

# 2. GoogleService-Info.plist 를 App 타겟 리소스로 (타겟 멤버십)
unless app.resources_build_phase.files.any? { |f| f.display_name == 'GoogleService-Info.plist' }
  gs_ref = parent_group.new_reference(app_dir.join('GoogleService-Info.plist').to_s)
  app.add_resources([gs_ref])
  changed << 'GoogleService-Info.plist -> App Resources'
end

# 3. App.entitlements 파일 참조 + CODE_SIGN_ENTITLEMENTS 연결 (Push capability)
unless project.files.any? { |f| f.display_name == 'App.entitlements' }
  parent_group.new_reference(app_dir.join('App.entitlements').to_s)
  changed << 'App.entitlements file reference'
end
app.build_configurations.each do |c|
  if c.build_settings['CODE_SIGN_ENTITLEMENTS'] != 'App/App.entitlements'
    c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
    changed << "CODE_SIGN_ENTITLEMENTS [#{c.name}]"
  end
end

project.save
puts '=== 변경 적용 ==='
changed.empty? ? (puts '  (변경 없음 — 이미 적용됨)') : changed.each { |c| puts "  + #{c}" }
