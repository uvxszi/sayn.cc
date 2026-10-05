#!/usr/bin/env ruby

require "yaml"
require "fileutils"

PAGE_SIZE = 100
SOURCE = "_gallery"
OUTPUT = "generated"

FileUtils.rm_rf(OUTPUT)
FileUtils.mkdir_p(OUTPUT)

def slugify(text)
  text
    .downcase
    .strip
    .gsub(/[\s_]+/, "-")
    .gsub(/[^a-z0-9\-]/, "")
    .gsub(/-+/, "-")
    .gsub(/\A-|-\z/, "")
end

def read_front_matter(path)
  text = File.read(path, encoding: "UTF-8")

  match = text.match(/\A---\s*\n(.*?)\n---\s*(?:\n|\z)/m)

  unless match
    raise "Missing front matter: #{path}"
  end

  YAML.safe_load(match[1], aliases: true) || {}
end

def write_page(filename, data)
  path = File.join(OUTPUT, filename)

  FileUtils.mkdir_p(File.dirname(path))

  File.write(
    path,
    data.to_yaml + "---\n",
    mode: "w",
    encoding: "UTF-8"
  )
end

items = Dir.glob(File.join(SOURCE, "*.{html,md}")).map do |path|
  data = read_front_matter(path)

  file = data.fetch("file")
  id = File.basename(file, File.extname(file))
  page_name = File.basename(path, File.extname(path))

  tags = Array(data["tags"])
    .map(&:to_s)
    .map(&:strip)
    .reject(&:empty?)
    .uniq

  {
    "id" => id,
    "title" => data.fetch("title"),
    "description" => data["description"].to_s,
    "alt" => data["alt"].to_s,
    "file" => file,
    "tags" => tags,
    "url" => "/gallery/#{page_name}/"
  }
end

# Alphabetical for now.
items.sort_by! { |item| item["title"].downcase }

all_tags = items
  .flat_map { |item| item["tags"] }
  .uniq
  .sort

def make_pages(items, all_tags, title:, description:, base_url:, file_prefix:)
  total_pages = [(items.length.to_f / PAGE_SIZE).ceil, 1].max

  total_pages.times do |index|
    page_number = index + 1

    page_items = items.slice(index * PAGE_SIZE, PAGE_SIZE) || []

    permalink =
      if page_number == 1
        base_url
      else
        "#{base_url}page/#{page_number}/"
      end

    prev_url =
      if page_number == 2
        base_url
      elsif page_number > 2
        "#{base_url}page/#{page_number - 1}/"
      end

    next_url =
      if page_number < total_pages
        "#{base_url}page/#{page_number + 1}/"
      end

    page_title =
      if page_number == 1
        title
      else
        "#{title} — Page #{page_number}"
      end

    write_page(
      "#{file_prefix}-#{page_number}.html",
      {
        "layout" => "gallery-list",
        "title" => page_title,
        "description" => description,
        "permalink" => permalink,
        "gallery_items" => page_items,
        "all_tags" => all_tags,
        "page_number" => page_number,
        "total_pages" => total_pages,
        "prev_url" => prev_url,
        "next_url" => next_url
      }
    )
  end
end

# Main gallery
make_pages(
  items,
  all_tags,
  title: "Gallery",
  description: "Official Sayn art, wallpapers, images and other visual material.",
  base_url: "/gallery/",
  file_prefix: "gallery"
)

# Static page for every tag
all_tags.each do |tag|
  tagged_items = items.select do |item|
    item["tags"].include?(tag)
  end

  slug = slugify(tag)

  pretty_name = tag
    .split(/[-_ ]/)
    .map(&:capitalize)
    .join(" ")

  make_pages(
    tagged_items,
    all_tags,
    title: "#{pretty_name} — Gallery",
    description: "Sayn gallery items tagged #{tag}.",
    base_url: "/gallery/tags/#{slug}/",
    file_prefix: "tag-#{slug}"
  )
end

puts "Generated #{items.length} gallery items."
puts "Generated #{all_tags.length} tag indexes."