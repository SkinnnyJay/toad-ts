class Toadstool < Formula
  desc "Terminal orchestration for AI development"
  homepage "https://github.com/SkinnnyJay/toad-ts"
  head "https://github.com/SkinnnyJay/toad-ts.git", branch: "main"

  depends_on "node"

  def install
    system "npm", "install", "--legacy-peer-deps"
    system "npm", "run", "build"
    libexec.install Dir["*"]
    bin.install_symlink libexec/"dist/cli.js" => "toadstool"
  end
end
