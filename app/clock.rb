require 'clockwork'
include Clockwork

handler do |job|
  puts "Running #{job}"
end


every(120.seconds, 'system "bundle exec rake populate:buses"'){ system( "bundle exec rake populate:buses") }

