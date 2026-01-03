# Latexmk configuration for AIRC whitepaper
$pdf_mode = 1;
$pdflatex = 'pdflatex -interaction=nonstopmode -shell-escape %O %S';
$bibtex_use = 2;
$clean_ext = 'aux bbl blg log out toc lof lot fls fdb_latexmk synctex.gz';
