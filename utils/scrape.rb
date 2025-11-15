#!/usr/bin/env ruby

require 'json'
require 'nokogiri'
require 'net/http'

# 優先從網路爬取繁體版本，失敗時使用本地文件
local_html_file = 'tmp/poke52.html'
remote_url = 'https://wiki.52poke.com/zh-hant/%E5%AE%9D%E5%8F%AF%E6%A2%A6%E5%88%97%E8%A1%A8%EF%BC%88%E6%8C%89%E5%AF%86%E9%98%BF%E9%9B%B7%E5%9B%BE%E9%89%B4%E7%BC%96%E5%8F%B7%EF%BC%89'

html_content = nil

# 嘗試從網路爬取繁體版本
begin
  puts "正在從網路爬取繁體中文寶可夢資料..."
  uri = URI(remote_url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  http.read_timeout = 10

  request = Net::HTTP::Get.new(uri)
  request['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  request['Accept-Language'] = 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'

  response = http.request(request)

  if response.code == '200'
    html_content = response.body
    puts "✓ 成功從網路獲取繁體版本\n"
  else
    raise "HTTP #{response.code}"
  end

rescue => e
  puts "⚠️  無法從網路爬取（#{e.message}），改用本地文件...\n"
  if File.exist?(local_html_file)
    html_content = File.read(local_html_file)
    puts "✓ 使用本地文件：#{local_html_file}\n"
  else
    puts "❌ 本地文件不存在：#{local_html_file}"
    exit 1
  end
end

puts "正在解析寶可夢資料..."
puts

begin
  doc = Nokogiri::HTML(html_content)

  pokemon_list = []

  # 查找表格 (class="roundy eplist bgl-ZA bd-ZA")
  tables = doc.css('table.roundy.eplist')
  puts "找到 #{tables.length} 個表格\n"

  tables.each do |table|
    rows = table.css('tbody tr')

    rows.each do |row|
      cells = row.css('td')
      next if cells.length < 2

      # 提取編號（第一個 cell 包含 #001 格式）
      id_cell = cells[0].text.strip
      id_match = id_cell.match(/#(\d+)/)
      next unless id_match

      id_str = id_match[1]
      num = id_str.to_i
      next unless num >= 1 && num <= 230

      # 提取名稱（在第四個 cell 中的 <a> 標籤）
      if cells[3]
        name_link = cells[3].css('a').first
        name_zh = name_link&.text&.strip

        # 跳過超級進化等變化形態（檢查是否有 <br> 標籤，表示有補充資訊）
        has_break = cells[3].inner_html.include?('<br')
        next if has_break
      end

      next unless name_zh && !name_zh.empty?

      # 提取 sprite 圖示 (在第三個 cell 中的 span 標籤，使用全國圖鑑編號)
      sprite_class = nil
      if cells[2]
        sprite_span = cells[2].css('span.sprite-icon').first
        sprite_classes = sprite_span&.attr('class')&.split(' ')
        if sprite_classes
          sprite_class = sprite_classes.find { |cls| cls.start_with?('sprite-icon-') }
        end
      end

      id = num.to_s.rjust(3, '0')
      pokemon_list << {
        'id' => id,
        'nameZh' => name_zh,
        'spriteClass' => sprite_class
      }

      puts "✓ #{id} - #{name_zh} (#{sprite_class})"
    end
  end

  # 檢查結果
  if pokemon_list.empty?
    raise "沒有找到任何寶可夢資料。HTML 結構可能已改變。"
  end

  if pokemon_list.length < 100
    raise "只找到 #{pokemon_list.length} 隻寶可夢，預期至少 100 隻。"
  end

  puts "\n✅ 成功提取 #{pokemon_list.length} 隻寶可夢"

  # 保存 JSON
  Dir.mkdir('data') unless Dir.exist?('data')
  File.write('data/pokemon.json', JSON.pretty_generate(pokemon_list))
  puts "✓ JSON 資料已保存到: data/pokemon.json"

  # 保存 JavaScript 檔案 (供 HTML 直接加載使用)
  js_content = "const pokemonList = #{JSON.pretty_generate(pokemon_list)};\n"
  File.write('data/pokemon.js', js_content)
  puts "✓ JavaScript 資料已保存到: data/pokemon.js\n"

rescue => e
  puts "\n❌ 解析失敗: #{e.message}"
  puts "\n請檢查："
  puts "1. 是否有 #{html_file} 文件"
  puts "2. HTML 文件格式是否正確"
  puts "3. 網站結構是否改變\n"
  exit 1
end
