FROM mcr.microsoft.com/devcontainers/javascript-node:18

# أدوات نظام إضافية
RUN apt-get update && apt-get install -y python3 python3-pip git-lfs

# تثبيت git-filter-repo متاح للاستخدام داخل الـ container
RUN python3 -m pip install --no-cache-dir git-filter-repo

# تعيين مجلد العمل
WORKDIR /workspaces/${GITHUB_REPOSITORY#*/}

# (corepack و node مثبتان بواسطة الصورة الأساسية)
