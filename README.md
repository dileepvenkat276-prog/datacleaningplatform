# DataForge Studio 

Professional-grade data cleaning, transformation, validation, and data quality management platform.

## Features
- **Duplicate Manager**: Exact & fuzzy matching (Levenshtein distance).
- **Missing Data Manager**: Mean, median, mode, zero, forward/backward fill, threshold pruning.
- **Text Cleaning Studio**: Casing conversion, whitespace trimming, regex find & replace, split & merge.
- **Data Type Converter**: Intelligent type suggestions with error protection.
- **Date & Time Cleaner**: Multi-format standardization & feature extraction (Year, Month, Day, Weekday).
- **Outlier Detection**: Tukey's IQR fences & Z-score analysis with user-confirmed actions.
- **Empty Data Cleaner**: Purge empty rows, columns, and zero-variance constant fields.
- **Transformation Studio**: Column renaming, filtering, multi-type sorting, group-by aggregation, IF/ELSE conditional logic, custom formula engine.
- **Data Quality Inspector**: 6 configurable dimensions (Completeness, Accuracy, Consistency, Uniqueness, Validity, Integrity) with 0-100 scoring.
- **AI Cleaning Assistant**: Natural language command parser with confirmation safeguards and undo.
- **Validation Engine**: Configurable schema rules with in-grid highlighting and batch fixes.
- **Recipes & Automation**: Reusable cleaning pipelines.
- **Before vs After Comparison**: Granular cell diff audit log.
- **Audit History**: Complete rollback snapshots and undo/redo.
- **Import & Export**: CSV, XLSX, XLS, JSON, TXT with preview and local-first browser processing.

## Deploying to GitHub Pages

This project is pre-configured with a GitHub Actions workflow in `.github/workflows/deploy.yml`.

### Quick Setup:
1. Create a new repository on [GitHub](https://github.com/new).
2. Push this project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of DataForge Studio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. GitHub Actions will automatically build and publish your website to:
   `https://<your-username>.github.io/<your-repo-name>/`
