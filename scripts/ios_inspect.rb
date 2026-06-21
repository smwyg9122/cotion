# encoding: utf-8
require 'xcodeproj'

PROJ = '/Users/maesterong/cotion/.claude/worktrees/stupefied-lalande-70ea82/packages/frontend/ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(PROJ)

puts "=== Targets ==="
project.targets.each { |t| puts "  #{t.name} (#{t.product_type})" }

puts "\n=== Existing SPM package references ==="
refs = project.root_object.package_references
if refs.empty?
  puts "  (none)"
else
  refs.each do |r|
    url = (r.respond_to?(:repositoryURL) ? r.repositoryURL : nil) || r.display_name
    puts "  #{url}"
  end
end

app = project.targets.find { |t| t.name == 'App' }
if app
  puts "\n=== App target package product dependencies ==="
  deps = app.package_product_dependencies
  deps.empty? ? (puts "  (none)") : deps.each { |d| puts "  #{d.product_name}" }

  puts "\n=== App target build settings (relevant) ==="
  app.build_configurations.each do |c|
    puts "  [#{c.name}] CODE_SIGN_ENTITLEMENTS = #{c.build_settings['CODE_SIGN_ENTITLEMENTS'] || '(none)'}"
    puts "  [#{c.name}] INFOPLIST_FILE         = #{c.build_settings['INFOPLIST_FILE'] || '(none)'}"
    puts "  [#{c.name}] BUNDLE_ID              = #{c.build_settings['PRODUCT_BUNDLE_IDENTIFIER']}"
  end

  puts "\n=== App target resource files ==="
  app.resources_build_phase.files.each { |f| puts "  #{f.display_name}" }
end
